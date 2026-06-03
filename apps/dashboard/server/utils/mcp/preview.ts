/**
 * @fileoverview Renders a staged draft into a complete, self-contained, styled
 * HTML document that mirrors the dashboard's CaseCard. `preview_cases` returns
 * this for the host (Claude) to render as an HTML artifact — the side-panel
 * preview the user reviews before committing.
 *
 * We use an HTML artifact (not the MCP Apps ui:// panel) because claude.ai web
 * renders artifacts reliably, while its MCP App panel rendering has open bugs.
 * Tabular questions become real <table>s from the TAB-delimited header/cells,
 * exactly like CaseCard.vue.
 */
import type { CaseDraft } from "./cases";
import type { XmlImportInput } from "@/shared/schema/input";

type DraftCase = XmlImportInput["cases"][number];
type DraftQuestion = DraftCase["questions"][number];

export function countQuestions(cases: XmlImportInput["cases"]): number {
  return cases.reduce((sum, c) => sum + c.questions.length, 0);
}

/* ─────────────────────── HTML rendering ─────────────────────── */

/** Escape text for safe insertion into HTML. */
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HTML_CSS = `
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;font:15px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;background:#fafafa;padding:20px}
.hdr{margin:0 0 16px}
.hdr h1{font-size:18px;margin:0 0 4px}
.hdr .sub{color:#71717a;font-size:13px}
.case{background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:18px 20px;margin:0 0 18px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.case>.klabel{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a1a1aa;margin-bottom:6px}
.stem{white-space:pre-line;margin:0 0 4px}
.imgs{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.imgs img{max-height:160px;max-width:240px;border-radius:8px;border:1px solid #e4e4e7;object-fit:contain;background:#fff}
.q{margin-top:14px;padding:14px 16px;border:1px solid #ececef;border-radius:10px;background:#fafafa}
.q-h{font-weight:600;text-decoration:underline;margin-bottom:8px}
.q-h .tag{margin-left:8px;font-size:11px;font-weight:500;text-decoration:none;background:#ececef;color:#52525b;padding:2px 8px;border-radius:999px}
.q .body{white-space:pre-line;margin-bottom:8px}
ol.choices{list-style:upper-alpha;padding-left:24px;margin:8px 0}
ol.choices li{margin:4px 0}
ol.choices li.correct{color:#15803d;font-weight:600}
ol.choices li .ce{display:block;font-size:12px;font-style:italic;color:#71717a;font-weight:400}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:13px}
th,td{border:1px solid #d4d4d8;padding:6px 9px;text-align:left}
th{background:#ececef}
tr.correct td{background:rgba(22,163,74,.12);color:#15803d;font-weight:600}
.expl{margin-top:10px;padding:10px 12px;border-radius:8px;background:#f0f9ff;border:1px solid #e0f2fe;font-size:14px}
.expl b{color:#0369a1}
`;

function imgGridHtml(urls: string[]): string {
  if (!urls?.length) return "";
  return `<div class="imgs">${urls
    .map((u) => `<img src="${esc(u)}" alt="image" loading="lazy">`)
    .join("")}</div>`;
}

function questionHtml(q: DraftQuestion, i: number): string {
  const tags = [`<span class="tag">${q.type === "Tabular" ? "tabular" : "default"}</span>`];
  if (q.isStudyMode) tags.push(`<span class="tag">study mode</span>`);

  let inner: string;
  if (q.type === "Tabular") {
    const cols = (q.header ?? "").split("\t");
    const head = `<tr><th>✓</th>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
    const rows = q.choices
      .map((ch) => {
        const cells = ch.body.split("\t");
        while (cells.length < cols.length) cells.push("");
        return `<tr class="${ch.isCorrect ? "correct" : ""}"><td>${
          ch.isCorrect ? "✓" : ""
        }</td>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
      })
      .join("");
    inner = `<table><thead>${head}</thead><tbody>${rows}</tbody></table>`;
  } else {
    inner = `<ol class="choices">${q.choices
      .map(
        (ch) =>
          `<li class="${ch.isCorrect ? "correct" : ""}">${esc(ch.body)}${
            ch.explanation ? `<span class="ce">${esc(ch.explanation)}</span>` : ""
          }</li>`
      )
      .join("")}</ol>`;
  }

  return `<div class="q"><div class="q-h">Q${i + 1}${tags.join("")}</div>
<div class="body">${esc(q.body)}</div>
${imgGridHtml(q.imgUrls)}
${inner}
<div class="expl"><b>Explanation:</b> ${esc(q.explanation)}</div>
${imgGridHtml(q.explanationImgUrls)}</div>`;
}

function caseHtml(c: DraftCase, i: number): string {
  return `<div class="case"><div class="klabel">Case ${i + 1}</div>
<div class="stem">${esc(c.body)}</div>
${imgGridHtml(c.imgUrls)}
${c.questions.map((q, qi) => questionHtml(q, qi)).join("\n")}</div>`;
}

/**
 * A complete, self-contained, styled HTML document for the cases in `draft`.
 * Returned by `preview_cases` for Claude to render as an HTML artifact.
 */
export function buildPreviewHtml(draft: CaseDraft): string {
  const total = countQuestions(draft.cases);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Case Preview</title>
<style>${HTML_CSS}</style></head>
<body>
<div class="hdr">
<h1>🩺 Case Preview — ${total} question(s) in ${draft.cases.length} case(s)</h1>
<div class="sub">${esc(draft.system)} › ${esc(draft.category)} · ${esc(draft.type)}</div>
</div>
${draft.cases.map((c, i) => caseHtml(c, i)).join("\n")}
</body></html>`;
}
