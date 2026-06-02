import { defineStore } from "pinia";
import type { Diagnostic } from "@codemirror/lint";
import { parseCasesXml, lineColToOffset } from "@/lib/parseCasesXml";
import { xmlImportSchema } from "@/shared/schema/input";
import type { CaseTypes } from "@/components/entry/Input/Index.vue";

export type ImportPreviewCase = {
  id: number;
  body: string;
  imgUrls: string[];
  type: CaseTypes;
  category_id: number | null;
  questions: Array<{
    id: number;
    body: string;
    type: "Default" | "Tabular";
    header: string | null;
    isStudyMode: boolean;
    imgUrls: string[];
    explanation: string;
    explanationImgUrls: string[];
    choices: Array<{
      id: number;
      body: string;
      isCorrect: boolean;
      explanation: string | null;
    }>;
  }>;
};

export type ImportIssue = { where: string; message: string };

/** A small starter template inserted on demand from the toolbar. */
export const SAMPLE_XML = `<cases>
  <case>
    <body>A 54-year-old man presents with crushing substasternal chest pain radiating to the left arm for the past hour.</body>
    <images>
      <image>https://i.imghippo.com/files/example-ecg.webp</image>
    </images>
    <question type="default" study-mode="false">
      <body>What is the most likely diagnosis?</body>
      <explanation>
        <body>ST-segment elevation in contiguous leads indicates an acute STEMI.</body>
      </explanation>
      <choices>
        <choice correct="true">
          <body>Acute myocardial infarction</body>
          <explanation>Classic presentation with ECG changes.</explanation>
        </choice>
        <choice><body>Gastroesophageal reflux disease</body></choice>
        <choice><body>Costochondritis</body></choice>
        <choice><body>Panic attack</body></choice>
      </choices>
    </question>
  </case>
</cases>`;

/** Human-readable label for a Zod issue path like
 *  ["cases", 1, "questions", 0, "choices", 2, "body"]. */
function describePath(path: (string | number)[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    const next = path[i + 1];
    const num = typeof next === "number" ? next + 1 : null;
    switch (key) {
      case "cases":
        if (num) parts.push(`Case ${num}`);
        i++;
        break;
      case "questions":
        if (num) parts.push(`Question ${num}`);
        i++;
        break;
      case "choices":
        if (num) parts.push(`Choice ${num}`);
        i++;
        break;
      case "imgUrls":
        parts.push("images");
        break;
      case "explanationImgUrls":
        parts.push("explanation images");
        break;
      default:
        if (typeof key === "string") parts.push(key);
    }
  }
  return parts.length ? parts.join(" › ") : "Import";
}

export const useXmlImportStore = defineStore("xmlImport", () => {
  const { $trpc } = useNuxtApp();

  const xmlText = ref("");
  const previewCases = ref<ImportPreviewCase[]>([]);
  /** Editor lint markers (XML syntax errors). */
  const diagnostics = ref<Diagnostic[]>([]);
  /** Human-readable validation problems shown in the error panel. */
  const issues = ref<ImportIssue[]>([]);
  const isParsed = ref(false);
  const submitting = ref(false);
  const submitError = ref<string | null>(null);

  /** Validated, DB-ready cases for the backend payload (no client ids). */
  let validatedCases: unknown[] = [];

  const hasContent = computed(() => xmlText.value.trim().length > 0);
  const summary = computed(() => {
    const cases = previewCases.value.length;
    const questions = previewCases.value.reduce(
      (sum, c) => sum + c.questions.length,
      0
    );
    return { cases, questions };
  });

  let uid = 0;
  const nextId = () => ++uid;

  function buildPreview(
    cases: ReturnType<typeof xmlImportSchema.parse>["cases"],
    type: CaseTypes,
    categoryId: number | null
  ): ImportPreviewCase[] {
    return cases.map((c) => ({
      id: nextId(),
      body: c.body,
      imgUrls: c.imgUrls,
      type,
      category_id: categoryId,
      questions: c.questions.map((q) => ({
        id: nextId(),
        body: q.body,
        type: q.type,
        header: q.header ?? null,
        isStudyMode: q.isStudyMode,
        imgUrls: q.imgUrls,
        explanation: q.explanation,
        explanationImgUrls: q.explanationImgUrls,
        choices: q.choices.map((ch) => ({
          id: nextId(),
          body: ch.body,
          isCorrect: ch.isCorrect,
          explanation: ch.explanation ?? null,
        })),
      })),
    }));
  }

  function clearResults() {
    previewCases.value = [];
    diagnostics.value = [];
    issues.value = [];
    isParsed.value = false;
    submitError.value = null;
    validatedCases = [];
  }

  /**
   * Parse + validate the current XML against the DB-aligned schema.
   * Returns true when the result is valid and ready to preview/import.
   */
  function parse(opts: { type: CaseTypes; category_id: number | null }): boolean {
    clearResults();

    const parsed = parseCasesXml(xmlText.value);
    if (!parsed.ok) {
      issues.value = parsed.errors.map((e) => ({
        where: e.line ? `Line ${e.line}` : "XML",
        message: e.message,
      }));
      diagnostics.value = parsed.errors
        .filter((e) => e.line)
        .map((e) => {
          const from = lineColToOffset(xmlText.value, e.line, e.column);
          return {
            from,
            to: Math.min(xmlText.value.length, from + 1),
            severity: "error" as const,
            message: e.message,
          };
        });
      return false;
    }

    const payload = {
      category_id: opts.category_id,
      type: opts.type,
      cases: parsed.cases,
    };
    const result = xmlImportSchema.safeParse(payload);
    if (!result.success) {
      issues.value = result.error.issues.map((issue) => ({
        where: describePath(issue.path as (string | number)[]),
        message: issue.message,
      }));
      return false;
    }

    validatedCases = result.data.cases;
    previewCases.value = buildPreview(
      result.data.cases,
      opts.type,
      opts.category_id
    );
    isParsed.value = true;
    return true;
  }

  /**
   * Send the validated batch to the backend in a single all-or-nothing
   * transaction. Returns the created cases (DB-shaped) or null on failure.
   */
  async function submit(opts: {
    type: CaseTypes;
    category_id: number | null;
  }): Promise<unknown[] | null> {
    // Never silently re-parse here: import exactly what was validated and shown
    // in the preview. If the text changed since the preview (which clears
    // `isParsed`/`validatedCases`), require the user to preview again.
    if (!isParsed.value || validatedCases.length === 0) {
      submitError.value =
        "The XML changed since the last preview. Please preview again before importing.";
      return null;
    }
    submitting.value = true;
    submitError.value = null;
    try {
      const created = await $trpc.block.addMany.mutate({
        category_id: opts.category_id,
        type: opts.type,
        cases: validatedCases as never,
      });
      return created;
    } catch (e) {
      submitError.value =
        e instanceof Error ? e.message : "Failed to import cases.";
      return null;
    } finally {
      submitting.value = false;
    }
  }

  function insertTemplate() {
    xmlText.value = SAMPLE_XML;
    clearResults();
  }

  function reset() {
    xmlText.value = "";
    clearResults();
  }

  /** Invalidate a parsed result when the text changes after parsing. */
  watch(xmlText, () => {
    if (isParsed.value) {
      isParsed.value = false;
      previewCases.value = [];
      validatedCases = [];
    }
  });

  return {
    xmlText,
    previewCases,
    diagnostics,
    issues,
    isParsed,
    submitting,
    submitError,
    hasContent,
    summary,
    parse,
    submit,
    insertTemplate,
    reset,
  };
});
