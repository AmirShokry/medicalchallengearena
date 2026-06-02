/**
 * @fileoverview Parser for the text-editor (bulk XML) data-entry mode.
 *
 * Turns the agent-authored XML (see QUESTION_GENERATION_PROMPT.md) into the
 * normalized, DB-aligned shape consumed by `xmlImportSchema`
 * (`shared/schema/input.ts`) and rendered by `EntryCaseCard`.
 *
 * Runs client-side only — it relies on the browser `DOMParser`. The app is a
 * Nuxt SPA (`ssr: false`), so this is always available where it's used.
 *
 * Design notes:
 *  • Tag/attribute matching is lenient: we accept both the improved schema
 *    (`correct`, `study-mode`, <choices> nested in <question>) and the original
 *    spellings (`is-correct`, `is-study-mode`, an optional <questions> wrapper,
 *    a <choices> sibling for single-question cases).
 *  • Tabular `header` columns and `choice` cells are written with " | " in the
 *    XML and joined with TAB ("\t") here — exactly how the GUI stores them.
 *  • Case `type` (STEP) and `category_id` are NOT in the XML; they are attached
 *    by the caller from the current page.
 */

export type ParsedChoice = {
  body: string;
  isCorrect: boolean;
  explanation: string | null;
};

export type ParsedQuestion = {
  type: "Default" | "Tabular";
  body: string;
  header: string | null;
  isStudyMode: boolean;
  imgUrls: string[];
  explanation: string;
  explanationImgUrls: string[];
  choices: ParsedChoice[];
};

export type ParsedCase = {
  body: string;
  imgUrls: string[];
  questions: ParsedQuestion[];
};

export type XmlIssue = {
  message: string;
  /** 1-based line, when the underlying parser reports it. */
  line?: number;
  /** 1-based column, when the underlying parser reports it. */
  column?: number;
};

export type ParseResult =
  | { ok: true; cases: ParsedCase[] }
  | { ok: false; cases: null; errors: XmlIssue[] };

/* ───────────────────────── DOM helpers ───────────────────────── */

/** Direct child elements matching any of the given (case-insensitive) tags. */
function children(el: Element | null, ...tags: string[]): Element[] {
  if (!el) return [];
  const want = tags.map((t) => t.toLowerCase());
  return Array.from(el.children).filter((c) =>
    want.includes(c.tagName.toLowerCase())
  );
}

function firstChild(el: Element | null, ...tags: string[]): Element | null {
  return children(el, ...tags)[0] ?? null;
}

/** Read an attribute trying several aliases (e.g. `correct`, `is-correct`). */
function attr(el: Element, ...names: string[]): string | null {
  for (const n of names) {
    const v = el.getAttribute(n);
    if (v !== null) return v;
  }
  return null;
}

function asBool(value: string | null): boolean {
  return value != null && value.trim().toLowerCase() === "true";
}

/**
 * Clean text content: normalize line endings, drop blank leading/trailing
 * lines, and remove the common leading indentation introduced by pretty-printed
 * XML (so multi-line bodies don't keep their source indentation), then trim.
 */
function cleanText(raw: string | null | undefined): string {
  if (!raw) return "";
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length === 0) return "";
  const indents = lines
    .filter((l) => l.trim() !== "")
    .map((l) => l.match(/^[ \t]*/)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(min))
    .join("\n")
    .trim();
}

/** Text from direct text/CDATA nodes only (ignores child elements). */
function ownText(el: Element | null): string {
  if (!el) return "";
  let out = "";
  for (const node of Array.from(el.childNodes))
    if (node.nodeType === 3 /* TEXT_NODE */ || node.nodeType === 4 /* CDATA */)
      out += node.nodeValue ?? "";
  return cleanText(out);
}

/**
 * The textual "body" of an element: its nested <body> child if present,
 * otherwise its own direct text. Used for explanations, which may be written
 * either as `<explanation>text</explanation>` or
 * `<explanation><body>text</body></explanation>`.
 */
function bodyText(el: Element | null): string {
  if (!el) return "";
  const body = firstChild(el, "body");
  if (body) return cleanText(body.textContent);
  return ownText(el);
}

/** Collect image URLs from an <images><image>…</image></images> block. */
function imageUrls(container: Element | null): string[] {
  const images = firstChild(container, "images");
  return children(images, "image")
    .map((img) => cleanText(img.textContent))
    .filter((url) => url.length > 0);
}

/** Convert " a | b | c " (XML-friendly) into "a\tb\tc" (DB/GUI format). */
function pipesToTabs(value: string): string {
  return value
    .split("|")
    .map((cell) => cell.trim())
    .join("\t");
}

/* ───────────────────────── parser ───────────────────────── */

export function parseCasesXml(xml: string): ParseResult {
  const source = (xml ?? "").trim();
  if (!source)
    return { ok: false, cases: null, errors: [{ message: "The editor is empty." }] };

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(source, "application/xml");
  } catch (e) {
    return {
      ok: false,
      cases: null,
      errors: [{ message: `Could not parse XML: ${(e as Error).message}` }],
    };
  }

  // DOMParser reports malformed XML as a <parsererror> element rather than
  // throwing. Surface its message (with a best-effort line/column).
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    const text = parserError.textContent ?? "Malformed XML.";
    const m = text.match(/line\s+(\d+).*?column\s+(\d+)/i);
    return {
      ok: false,
      cases: null,
      errors: [
        {
          message: text.replace(/\s+/g, " ").trim(),
          line: m ? Number(m[1]) : undefined,
          column: m ? Number(m[2]) : undefined,
        },
      ],
    };
  }

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "cases")
    return {
      ok: false,
      cases: null,
      errors: [
        {
          message: `The root element must be <cases> (found <${
            root ? root.tagName : "nothing"
          }>).`,
        },
      ],
    };

  const caseEls = children(root, "case");
  if (caseEls.length === 0)
    return {
      ok: false,
      cases: null,
      errors: [{ message: "No <case> elements found inside <cases>." }],
    };

  const cases: ParsedCase[] = caseEls.map((caseEl) => {
    // Questions: direct <question> children, plus any inside a <questions> wrapper.
    const questionEls = [
      ...children(caseEl, "question"),
      ...children(firstChild(caseEl, "questions"), "question"),
    ];

    const questions: ParsedQuestion[] = questionEls.map((qEl) => {
      const rawType = (attr(qEl, "type") ?? "default").trim().toLowerCase();
      const type: "Default" | "Tabular" =
        rawType === "tabular" ? "Tabular" : "Default";

      // Choices live inside <question><choices>. Fallback: a <choices> sibling
      // (legacy single-question layout) directly under the question's parent.
      // Only applied when the case has exactly ONE question — otherwise every
      // question would wrongly share the same sibling <choices>.
      let choicesEl = firstChild(qEl, "choices");
      if (!choicesEl && questionEls.length === 1 && qEl.parentElement)
        choicesEl = firstChild(qEl.parentElement, "choices");

      const choices: ParsedChoice[] = children(choicesEl, "choice").map(
        (cEl) => {
          const body = bodyText(cEl);
          const explEl = firstChild(cEl, "explanation");
          const explanation = explEl ? bodyText(explEl) : "";
          return {
            body: type === "Tabular" ? pipesToTabs(body) : body,
            isCorrect: asBool(attr(cEl, "correct", "is-correct")),
            explanation: explanation.length ? explanation : null,
          };
        }
      );

      const headerRaw = cleanText(firstChild(qEl, "header")?.textContent);
      const explanationEl = firstChild(qEl, "explanation");

      return {
        type,
        body: bodyText(qEl),
        header:
          type === "Tabular" && headerRaw ? pipesToTabs(headerRaw) : null,
        isStudyMode: asBool(attr(qEl, "study-mode", "is-study-mode")),
        imgUrls: imageUrls(qEl),
        explanation: bodyText(explanationEl),
        explanationImgUrls: imageUrls(explanationEl),
        choices,
      };
    });

    return {
      body: bodyText(caseEl),
      imgUrls: imageUrls(caseEl),
      questions,
    };
  });

  return { ok: true, cases };
}

/** Map a 1-based line/column to a 0-based character offset in `text`. */
export function lineColToOffset(
  text: string,
  line?: number,
  column?: number
): number {
  if (!line || line < 1) return 0;
  const lines = text.split("\n");
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++)
    offset += lines[i].length + 1; // +1 for the newline
  return offset + Math.max(0, (column ?? 1) - 1);
}
