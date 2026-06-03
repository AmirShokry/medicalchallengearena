/**
 * @fileoverview Browser entry for the MCP Apps preview panel (the `ui://preview`
 * resource). It is NOT server code — it is bundled by esbuild into
 * `public/_mcp/panel.js` (an IIFE) and loaded as an external <script> by the
 * panel HTML inside Claude's sandboxed iframe.
 *
 *   build:  esbuild mcp/panel.entry.ts --bundle --format=iife --minify \
 *             --outfile=public/_mcp/panel.js
 *
 * Why a separate external bundle (not inline HTML): MCP App iframes run under a
 * strict CSP that blocks inline <script>. An external script from a CSP-
 * whitelisted origin (the dashboard) is the reliable path. Styling is applied
 * via CSSOM (constructed stylesheet / element.style), which `style-src` does
 * not govern, so it works without `unsafe-inline`.
 *
 * Data flow: the host delivers `preview_cases`'s result to `toolresult`; we read
 * `structuredContent` (a PreviewPayload) and render it, mirroring the dashboard's
 * CaseCard. "Confirm & add" calls the server `commit_cases` tool with the draftId
 * (host requires user approval), giving the review→commit gate.
 */
import { App } from "@modelcontextprotocol/ext-apps";

type Choice = { body: string; isCorrect?: boolean; explanation?: string | null };
type Question = {
  type: "Default" | "Tabular";
  body: string;
  header?: string | null;
  isStudyMode?: boolean | null;
  imgUrls: string[];
  explanation: string;
  explanationImgUrls: string[];
  choices: Choice[];
};
type Case = { body: string; imgUrls: string[]; questions: Question[] };
type PreviewPayload = {
  draftId: string;
  system: string;
  category: string;
  caseType: string;
  summary: { cases: number; questions: number };
  cases: Case[];
};

/* ───────────────────────── styling (CSSOM) ───────────────────────── */

const CSS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.5 var(--font-sans, system-ui, sans-serif);
  color: var(--color-text-primary, #1a1a1a); background: transparent; }
.wrap { padding: 16px; max-width: 880px; margin: 0 auto; }
.bar { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px;
  align-items: center; justify-content: space-between; padding: 12px 14px;
  margin-bottom: 14px; border-radius: 12px;
  background: var(--color-background-secondary, #f4f4f5);
  border: 1px solid var(--color-border-primary, #e4e4e7); }
.bar .meta { font-size: 13px; opacity: .85; }
.bar .meta b { font-weight: 600; }
.btns { display: flex; gap: 8px; }
button { font: inherit; font-weight: 600; padding: 8px 14px; border-radius: 9px;
  border: 1px solid transparent; cursor: pointer; }
button.primary { background: #16a34a; color: #fff; }
button.primary:disabled { opacity: .55; cursor: default; }
button.ghost { background: transparent; border-color: var(--color-border-primary, #d4d4d8);
  color: inherit; }
.case { border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;
  background: var(--color-background-secondary, #f7f7f8);
  border: 1px solid var(--color-border-primary, #e4e4e7); }
.case > .stem { white-space: pre-line; }
.kase-h { font-weight: 700; font-size: 12px; letter-spacing: .04em;
  text-transform: uppercase; opacity: .6; margin-bottom: 6px; }
.q { margin-top: 12px; padding: 12px 14px; border-radius: 10px;
  background: var(--color-background-primary, #fff);
  border: 1px solid var(--color-border-secondary, #ececef); }
.q-h { font-weight: 600; text-decoration: underline; margin-bottom: 6px; }
.q-h .tag { margin-left: 8px; font-size: 11px; text-decoration: none;
  background: var(--color-background-tertiary, #ececef); padding: 1px 7px;
  border-radius: 999px; opacity: .8; font-weight: 500; }
.q .body { white-space: pre-line; margin-bottom: 8px; }
ol.choices { list-style: upper-alpha; padding-left: 22px; margin: 6px 0; }
ol.choices li { margin: 3px 0; }
ol.choices li.correct { color: #15803d; font-weight: 600; }
.expl { margin-top: 8px; padding: 8px 10px; border-radius: 8px; font-size: 13px;
  background: var(--color-background-tertiary, #f0f0f2); }
.ch-expl { display: block; opacity: .8; font-size: 12px; font-style: italic; }
table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 13px; }
th, td { border: 1px solid var(--color-border-primary, #d4d4d8); padding: 5px 8px;
  text-align: left; }
th { background: var(--color-background-tertiary, #ececef); }
tr.correct td { background: rgba(22,163,74,.12); color: #15803d; font-weight: 600; }
.imgs { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.imgs img { max-height: 150px; max-width: 220px; border-radius: 8px;
  border: 1px solid var(--color-border-primary, #e4e4e7); object-fit: contain; }
.status { margin-top: 10px; padding: 10px 12px; border-radius: 9px; font-weight: 500; }
.status.ok { background: rgba(22,163,74,.14); color: #166534; }
.status.err { background: rgba(220,38,38,.12); color: #991b1b; }
.muted { opacity: .6; }
`;

function applyStyles() {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch {
    // Fallback for engines without constructable stylesheets.
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
  }
}

/* ───────────────────────── DOM helpers ───────────────────────── */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: cls, ...rest } = props as Record<string, unknown>;
  if (cls) node.className = String(cls);
  Object.assign(node, rest);
  for (const c of children)
    node.append(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

function imageRow(label: string, urls: string[]): HTMLElement | null {
  if (!urls?.length) return null;
  return el(
    "div",
    { class: "imgs" },
    urls.map((u) => {
      const img = el("img", { alt: label });
      img.src = u;
      return img;
    })
  );
}

function renderTabular(q: Question): HTMLElement {
  const cols = (q.header ?? "").split("\t");
  const thead = el("thead", {}, [
    el("tr", {}, [el("th", {}, ["✓"]), ...cols.map((c) => el("th", {}, [c]))]),
  ]);
  const rows = q.choices.map((ch) => {
    const cells = ch.body.split("\t");
    while (cells.length < cols.length) cells.push("");
    const tr = el("tr", {}, [
      el("td", {}, [ch.isCorrect ? "✓" : ""]),
      ...cells.map((cell) => el("td", {}, [cell])),
    ]);
    if (ch.isCorrect) tr.className = "correct";
    return tr;
  });
  return el("table", {}, [thead, el("tbody", {}, rows)]);
}

function renderDefaultChoices(q: Question): HTMLElement {
  return el(
    "ol",
    { class: "choices" },
    q.choices.map((ch) => {
      const kids: (Node | string)[] = [ch.body];
      if (ch.explanation)
        kids.push(el("span", { class: "ch-expl" }, [ch.explanation]));
      const li = el("li", {}, kids);
      if (ch.isCorrect) li.className = "correct";
      return li;
    })
  );
}

function renderQuestion(q: Question, i: number): HTMLElement {
  const tags: (Node | string)[] = [
    `Q${i + 1}`,
    el("span", { class: "tag" }, [q.type === "Tabular" ? "tabular" : "default"]),
  ];
  if (q.isStudyMode) tags.push(el("span", { class: "tag" }, ["study mode"]));

  const block = el("div", { class: "q" }, [
    el("div", { class: "q-h" }, tags),
    el("div", { class: "body" }, [q.body]),
  ]);
  const qImgs = imageRow("Question image", q.imgUrls);
  if (qImgs) block.append(qImgs);
  block.append(q.type === "Tabular" ? renderTabular(q) : renderDefaultChoices(q));
  block.append(
    el("div", { class: "expl" }, [el("b", {}, ["Explanation: "]), q.explanation])
  );
  const eImgs = imageRow("Explanation image", q.explanationImgUrls);
  if (eImgs) block.append(eImgs);
  return block;
}

function renderCase(c: Case, i: number): HTMLElement {
  const node = el("div", { class: "case" }, [
    el("div", { class: "kase-h" }, [`Case ${i + 1}`]),
    el("div", { class: "stem" }, [c.body]),
  ]);
  const imgs = imageRow("Case image", c.imgUrls);
  if (imgs) node.append(imgs);
  c.questions.forEach((q, qi) => node.append(renderQuestion(q, qi)));
  return node;
}

/* ───────────────────────── app wiring ───────────────────────── */

const root = el("div", { class: "wrap" });
document.body.appendChild(root);
applyStyles();

// No app capabilities to declare — we only call server tools (a host capability)
// and render. Calling app.callServerTool works as long as the host supports it.
const app = new App({ name: "med-arena-preview", version: "1.0.0" });

let committed = false;

function setStatus(node: HTMLElement, text: string, kind: "ok" | "err") {
  const existing = node.querySelector(".status");
  if (existing) existing.remove();
  node.appendChild(el("div", { class: `status ${kind}` }, [text]));
}

function render(payload: PreviewPayload) {
  root.replaceChildren();

  const meta = el("div", { class: "meta" }, [
    `Adding `,
    el("b", {}, [String(payload.summary.cases)]),
    ` case(s), `,
    el("b", {}, [String(payload.summary.questions)]),
    ` question(s) to `,
    el("b", {}, [`${payload.system} › ${payload.category}`]),
    ` · ${payload.caseType}`,
  ]);

  const confirmBtn = el("button", { class: "primary" }, ["Confirm & add"]);
  const bar = el("div", { class: "bar" }, [
    meta,
    el("div", { class: "btns" }, [confirmBtn]),
  ]);
  root.append(bar);

  payload.cases.forEach((c, i) => root.append(renderCase(c, i)));

  confirmBtn.onclick = async () => {
    if (committed) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Adding…";
    try {
      const res = await app.callServerTool({
        name: "commit_cases",
        arguments: { draftId: payload.draftId },
      });
      const text =
        (res.content?.find((b: any) => b.type === "text") as any)?.text ?? "";
      if (res.isError) {
        setStatus(bar, text || "Could not add the cases.", "err");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Try again";
      } else {
        committed = true;
        confirmBtn.textContent = "Added ✓";
        setStatus(bar, text || "Cases added to the website.", "ok");
      }
    } catch (e) {
      setStatus(bar, `Failed: ${(e as Error).message}`, "err");
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Try again";
    }
  };
}

// Register the result handler BEFORE connect() so we don't miss the one-shot
// delivery of the preview_cases result.
app.addEventListener("toolresult", (params: any) => {
  const payload = params?.structuredContent as PreviewPayload | undefined;
  if (payload?.cases) render(payload);
});

root.append(el("div", { class: "muted" }, ["Loading preview…"]));

app.connect().catch((e) => {
  root.replaceChildren(
    el("div", { class: "status err" }, [
      `Could not connect to Claude: ${(e as Error).message}`,
    ])
  );
});
