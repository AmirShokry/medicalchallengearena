/**
 * @fileoverview Renders a staged draft into (a) a markdown text preview that any
 * MCP client can show in chat, and (b) a structured payload the MCP App panel
 * consumes via `ontoolresult`.
 *
 * The markdown is the GUARANTEED review surface: even where the interactive
 * panel doesn't render (older client, mobile, CSP issue), the user still sees a
 * complete, image-linked summary and can approve with "looks good". Tabular
 * questions are rendered as real markdown tables (matching `CaseCard.vue`,
 * which builds an HTML <table> from the TAB-delimited header/cells).
 */
import type { CaseDraft, CaseType } from "./cases";
import type { XmlImportInput } from "@/shared/schema/input";

type DraftCase = XmlImportInput["cases"][number];
type DraftQuestion = DraftCase["questions"][number];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Structured data handed to the panel (URLs only — stays well under size caps). */
export type PreviewPayload = {
  draftId: string;
  system: string;
  category: string;
  caseType: CaseType;
  summary: { cases: number; questions: number };
  cases: XmlImportInput["cases"];
};

export function countQuestions(cases: XmlImportInput["cases"]): number {
  return cases.reduce((sum, c) => sum + c.questions.length, 0);
}

export function buildPreviewPayload(draft: CaseDraft): PreviewPayload {
  return {
    draftId: draft.id,
    system: draft.system,
    category: draft.category,
    caseType: draft.type,
    summary: { cases: draft.cases.length, questions: countQuestions(draft.cases) },
    cases: draft.cases,
  };
}

/* ─────────────────────────── markdown ─────────────────────────── */

/** Escape a value for use inside a markdown table cell. */
function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n+/g, " ").trim();
}

function imageList(label: string, urls: string[]): string[] {
  if (!urls.length) return [];
  const links = urls.map((u, i) => `[${label} ${i + 1}](${u})`).join(" · ");
  return [`🖼️ ${links}`];
}

function renderTabular(q: DraftQuestion): string[] {
  const lines: string[] = [];
  const columns = (q.header ?? "").split("\t");
  lines.push(`| ✓ | ${columns.map(cell).join(" | ")} |`);
  lines.push(`| --- | ${columns.map(() => "---").join(" | ")} |`);
  for (const choice of q.choices) {
    const cells = choice.body.split("\t").map(cell);
    // Pad/truncate defensively so the row width matches the header.
    while (cells.length < columns.length) cells.push("");
    lines.push(`| ${choice.isCorrect ? "✅" : ""} | ${cells.join(" | ")} |`);
  }
  return lines;
}

function renderDefaultChoices(q: DraftQuestion): string[] {
  const lines: string[] = [];
  q.choices.forEach((choice, i) => {
    const letter = LETTERS[i] ?? String(i + 1);
    const mark = choice.isCorrect ? " ✅" : "";
    lines.push(`- **${letter}.**${mark} ${choice.body}`);
    if (choice.explanation) lines.push(`  - _${choice.explanation}_`);
  });
  return lines;
}

function renderQuestion(q: DraftQuestion, index: number): string[] {
  const tags = [q.type === "Tabular" ? "tabular" : "default"];
  if (q.isStudyMode) tags.push("study mode");
  const lines: string[] = [`**Q${index + 1}** _(${tags.join(", ")})_`, "", q.body, ""];
  lines.push(...imageList("Question image", q.imgUrls));
  if (q.imgUrls.length) lines.push("");

  if (q.type === "Tabular") lines.push(...renderTabular(q));
  else lines.push(...renderDefaultChoices(q));

  lines.push("", `**Explanation:** ${q.explanation}`);
  lines.push(...imageList("Explanation image", q.explanationImgUrls));
  return lines;
}

function renderCase(c: DraftCase, index: number): string[] {
  const lines: string[] = [`### Case ${index + 1}`, "", c.body, ""];
  lines.push(...imageList("Case image", c.imgUrls));
  if (c.imgUrls.length) lines.push("");
  c.questions.forEach((q, qi) => {
    lines.push(...renderQuestion(q, qi));
    lines.push("");
  });
  return lines;
}

/**
 * Full human-readable preview for the chat (the reliable fallback). Includes a
 * header with the target system/category/STEP and the draft id used to commit.
 */
export function buildMarkdownPreview(draft: CaseDraft): string {
  const total = countQuestions(draft.cases);
  const head = [
    `## Preview — ${draft.cases.length} case(s), ${total} question(s)`,
    "",
    `**Target:** ${draft.system} › ${draft.category} · ${draft.type}`,
    "",
    `**Draft ID:** \`${draft.id}\``,
    "",
    "> Review the cases below. **Nothing is saved yet.** When the user confirms, append " +
      `them by calling \`commit_cases\` with \`draftId: "${draft.id}"\` (append-only — existing ` +
      "content is never changed). To revise, just say what to change and I'll re-preview.",
    "",
    "---",
    "",
  ];
  const body = draft.cases.flatMap((c, i) => [...renderCase(c, i), "---", ""]);
  return [...head, ...body].join("\n").trimEnd();
}
