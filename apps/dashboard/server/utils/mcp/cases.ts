/**
 * @fileoverview Core logic for the MCP connector's case-authoring flow.
 *
 * This is the single place that turns connector input (structured JSON *or* the
 * `<cases>` XML format) into the DB-aligned shape and validates it against the
 * SAME authoritative schema the dashboard uses (`xmlImportSchema`). Keeping the
 * connector on that schema guarantees byte-for-byte validation parity with the
 * GUI / text-editor entry paths.
 *
 * Responsibilities:
 *  • JSON → normalized cases (tabular header/choice cells: arrays or "a | b"
 *    pipe-strings → TAB, exactly as the GUI stores them).
 *  • XML → normalized cases via `@xmldom/xmldom` + the shared `normalizeCasesRoot`
 *    core (so XML normalization rules never drift from the dashboard).
 *  • Validation against `xmlImportSchema` with human-readable issue messages
 *    (ported from the dashboard's `xmlImport` Pinia store).
 *  • Systems/categories lookup ("must check the db").
 *  • Short-lived draft storage in Redis (the stage→commit gate).
 *
 * Runs server-side only (Nitro). Do NOT import the browser `DOMParser` here.
 */
import { DOMParser } from "@xmldom/xmldom";
import { z } from "zod";
import { db, and, eq } from "@package/database";
import { getCache, setCache, delCache } from "@package/redis";
import {
  normalizeCasesRoot,
  pipesToTabs,
  type ParsedCase,
} from "@/lib/parseCasesXml";
import {
  xmlImportSchema,
  CASE_TYPES,
  type XmlImportInput,
} from "@/shared/schema/input";

/* ─────────────────────────── types ─────────────────────────── */

export type CaseType = (typeof CASE_TYPES)[number];

/** A validation/parse problem, shaped like the dashboard's error panel rows. */
export type CaseIssue = { where: string; message: string };

export type ValidateResult =
  | { ok: true; data: XmlImportInput }
  | { ok: false; issues: CaseIssue[] };

export type ParseResult =
  | { ok: true; cases: ParsedCase[] }
  | { ok: false; issues: CaseIssue[] };

/** What we persist between `preview_cases` and `commit_cases`. */
export type CaseDraft = {
  id: string;
  system: string;
  category: string;
  category_id: number | null;
  type: CaseType;
  cases: XmlImportInput["cases"];
  createdAt: string;
};

/* ───────────────── LLM-facing JSON input schema ─────────────────
 * Intentionally permissive: this only gives Claude a shape. The REAL,
 * authoritative checks happen in `xmlImportSchema` after normalization, so
 * semantic problems surface as friendly issues rather than opaque SDK errors. */

const cellsSchema = z.union([z.string(), z.array(z.string())]);

export const jsonChoiceSchema = z.object({
  body: cellsSchema.describe(
    "Choice text. For tabular questions, the row cells as an array (preferred) or a 'a | b | c' string."
  ),
  isCorrect: z
    .boolean()
    .optional()
    .describe("Exactly one choice per question must be true."),
  explanation: z
    .string()
    .optional()
    .nullable()
    .describe("Optional per-choice explanation."),
});

export const jsonQuestionSchema = z.object({
  type: z
    .string()
    .optional()
    .describe('"default" or "tabular" (case-insensitive). Defaults to default.'),
  body: z.string().describe("The question prompt."),
  header: cellsSchema
    .optional()
    .nullable()
    .describe(
      "Tabular only: column labels as an array (preferred) or 'A | B | C'. Omit for default questions."
    ),
  isStudyMode: z
    .boolean()
    .optional()
    .describe("Only allowed when the case has more than one question."),
  imgUrls: z
    .array(z.string())
    .optional()
    .describe("Hosted http(s) image URLs (use upload_image first)."),
  explanation: z.string().describe("Why the correct answer is correct."),
  explanationImgUrls: z.array(z.string()).optional(),
  choices: z.array(jsonChoiceSchema).describe("At least 2; exactly one correct."),
});

export const jsonCaseSchema = z.object({
  body: z.string().describe("The clinical stem / vignette."),
  imgUrls: z.array(z.string()).optional(),
  questions: z.array(jsonQuestionSchema).describe("One or more questions."),
});

export type JsonCase = z.infer<typeof jsonCaseSchema>;
type JsonQuestion = z.infer<typeof jsonQuestionSchema>;

/* ─────────────────────── normalization ─────────────────────── */

/** Tabular cells → TAB-joined string (matches the GUI/DB encoding). */
function cellsToTab(value: string | string[] | null | undefined): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map((c) => String(c).trim()).join("\t");
  return value.includes("|") ? pipesToTabs(value) : value;
}

function asString(value: string | string[] | null | undefined): string {
  if (value == null) return "";
  return Array.isArray(value) ? value.join(" ") : value;
}

/**
 * Map the LLM JSON shape onto the exact `ParsedCase[]` shape produced by the
 * XML parser, so both paths feed `xmlImportSchema` identically.
 *
 * Mirrors `normalizeCasesRoot`: tabular header/choice cells are TAB-joined;
 * a header is only kept for tabular questions; `type` defaults to Default.
 */
export function normalizeJsonCases(cases: JsonCase[]): ParsedCase[] {
  return cases.map((c) => ({
    body: c.body ?? "",
    imgUrls: c.imgUrls ?? [],
    questions: (c.questions ?? []).map((q: JsonQuestion) => {
      const isTabular = (q.type ?? "default").trim().toLowerCase() === "tabular";
      const headerRaw = cellsToTab(q.header);
      return {
        type: isTabular ? ("Tabular" as const) : ("Default" as const),
        body: q.body ?? "",
        header: isTabular && headerRaw ? headerRaw : null,
        isStudyMode: !!q.isStudyMode,
        imgUrls: q.imgUrls ?? [],
        explanation: q.explanation ?? "",
        explanationImgUrls: q.explanationImgUrls ?? [],
        choices: (q.choices ?? []).map((ch) => ({
          body: isTabular ? cellsToTab(ch.body) : asString(ch.body),
          isCorrect: !!ch.isCorrect,
          explanation:
            ch.explanation && ch.explanation.length ? ch.explanation : null,
        })),
      };
    }),
  }));
}

/* ─────────────────────────── XML path ─────────────────────────── */

/**
 * Parse the `<cases>` XML into normalized cases using @xmldom/xmldom and the
 * shared `normalizeCasesRoot` core. xmldom THROWS a ParseError (with a locator)
 * on malformed XML, so we wrap in try/catch and also capture non-fatal warnings.
 */
export function parseCasesXmlNode(xml: string): ParseResult {
  const source = (xml ?? "").trim();
  if (!source)
    return { ok: false, issues: [{ where: "XML", message: "The XML is empty." }] };

  // xmldom DOMParser. It THROWS a ParseError (with a .locator) on fatal
  // well-formedness errors, so the parse itself is wrapped in try/catch.
  // (Document/Element are intentionally not named here — the Nitro server tsconfig
  // has no DOM lib; we use xmldom's inferred return type instead.)
  const parser = new DOMParser({
    onError: (level, msg) => {
      // Surface fatal problems; warnings are tolerated (lenient like the GUI).
      if (level === "fatalError" || level === "error")
        throw new Error(typeof msg === "string" ? msg : String(msg));
    },
  });

  let doc: ReturnType<typeof parser.parseFromString>;
  try {
    doc = parser.parseFromString(source, "text/xml");
  } catch (e) {
    const err = e as Error & { locator?: { lineNumber?: number; columnNumber?: number } };
    const where = err?.locator?.lineNumber ? `Line ${err.locator.lineNumber}` : "XML";
    return {
      ok: false,
      issues: [{ where, message: `Could not parse XML: ${err.message}` }],
    };
  }

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "cases")
    return {
      ok: false,
      issues: [
        {
          where: "XML",
          message: `The root element must be <cases> (found <${
            root ? root.tagName : "nothing"
          }>).`,
        },
      ],
    };

  // The normalizer is DOM-agnostic; bridge the xmldom element type to its param.
  const cases = normalizeCasesRoot(
    root as unknown as Parameters<typeof normalizeCasesRoot>[0]
  );
  if (cases.length === 0)
    return {
      ok: false,
      issues: [
        { where: "XML", message: "No <case> elements found inside <cases>." },
      ],
    };

  return { ok: true, cases };
}

/* ───────────────────────── validation ───────────────────────── */

/**
 * Human-readable label for a Zod issue path like
 * ["cases", 1, "questions", 0, "choices", 2, "body"].
 * Ported from the dashboard's `xmlImport` store so messages match the GUI.
 */
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

/**
 * Validate normalized cases against the authoritative `xmlImportSchema`.
 * `type` (STEP) and `category_id` come from the page/tool args, never the body.
 */
export function validateCases(input: {
  category_id: number | null;
  type: CaseType;
  // Accept freshly-normalized cases OR an already-validated draft (whose optional
  // fields differ slightly); xmlImportSchema re-validates either way.
  cases: ParsedCase[] | XmlImportInput["cases"];
}): ValidateResult {
  const result = xmlImportSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      where: describePath(issue.path as (string | number)[]),
      message: issue.message,
    })),
  };
}

/* ───────────────────── systems / categories ───────────────────── */

export type SystemWithCategories = {
  id: number;
  name: string;
  categories: { id: number; name: string }[];
};

/** All systems with their categories (ids + names) — the "check the db" list. */
export async function listSystemsAndCategories(): Promise<SystemWithCategories[]> {
  const [systemsData, categoriesData] = await Promise.all([
    db
      .select({ id: db.table.systems.id, name: db.table.systems.name })
      .from(db.table.systems)
      .orderBy(db.table.systems.id),
    db
      .select({
        id: db.table.categories.id,
        name: db.table.categories.name,
        system_id: db.table.categories.system_id,
      })
      .from(db.table.categories)
      .orderBy(db.table.categories.id),
  ]);

  return systemsData.map((s) => ({
    id: s.id,
    name: s.name,
    categories: categoriesData
      .filter((c) => c.system_id === s.id)
      .map((c) => ({ id: c.id, name: c.name })),
  }));
}

/**
 * Resolve a (system, category) pair to its category id, requiring the two to be
 * related (same logic as the dashboard's `common.isValidSystemCategory`).
 * Returns null when the pair doesn't exist / isn't related.
 */
export async function resolveCategoryId(
  system: string,
  category: string
): Promise<number | null> {
  const rows = await db
    .selectDistinct({ id: db.table.categories.id })
    .from(db.table.systems)
    .innerJoin(
      db.table.categories,
      eq(db.table.systems.id, db.table.categories.system_id)
    )
    .where(
      and(
        eq(db.table.systems.name, system),
        eq(db.table.categories.name, category)
      )
    )
    .limit(1);
  return rows.length ? rows[0].id : null;
}

/* ─────────────────────────── drafts ─────────────────────────── */

const DRAFT_TTL_SECONDS = 30 * 60; // 30 minutes
const draftKey = (id: string) => `mcp:draft:${id}`;

/** Persist a validated batch and return its draft id (the stage→commit handle).
 *  The id is short and human-friendly so it can be read/relayed easily. */
export async function saveDraft(
  draft: Omit<CaseDraft, "id" | "createdAt">
): Promise<CaseDraft> {
  const full: CaseDraft = {
    ...draft,
    id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    createdAt: new Date().toISOString(),
  };
  await setCache(draftKey(full.id), full, DRAFT_TTL_SECONDS);
  return full;
}

/* ─────────────── shared prepare (resolve + normalize + validate) ─────────────── */

export type PrepareInput = {
  system: string;
  category: string;
  caseType: CaseType;
  cases?: JsonCase[];
  xml?: string;
};

export type PrepareResult =
  | { ok: true; categoryId: number; cases: XmlImportInput["cases"] }
  | { ok: false; needTarget?: boolean; issues: CaseIssue[] };

/**
 * Resolve the (system, category) target, normalize JSON-or-XML input, and validate
 * against `xmlImportSchema`. Shared by `preview_cases` and the direct-commit
 * fallback so both behave identically.
 */
export async function prepareImport(input: PrepareInput): Promise<PrepareResult> {
  const categoryId = await resolveCategoryId(input.system, input.category);
  if (categoryId === null)
    return {
      ok: false,
      needTarget: true,
      issues: [
        {
          where: "target",
          message: `"${input.system} › ${input.category}" was not found (or they aren't related).`,
        },
      ],
    };

  const hasJson = !!input.cases?.length;
  const hasXml = !!input.xml?.trim();
  if (!hasJson && !hasXml)
    return { ok: false, issues: [{ where: "input", message: "Provide either `cases` (JSON) or `xml`." }] };
  if (hasJson && hasXml)
    return { ok: false, issues: [{ where: "input", message: "Provide only one of `cases` or `xml`, not both." }] };

  let normalized: ParsedCase[];
  if (hasXml) {
    const parsed = parseCasesXmlNode(input.xml!);
    if (!parsed.ok) return { ok: false, issues: parsed.issues };
    normalized = parsed.cases;
  } else {
    normalized = normalizeJsonCases(input.cases!);
  }

  const validated = validateCases({
    category_id: categoryId,
    type: input.caseType,
    cases: normalized,
  });
  if (!validated.ok) return { ok: false, issues: validated.issues };
  return { ok: true, categoryId, cases: validated.data.cases };
}

export async function loadDraft(id: string): Promise<CaseDraft | null> {
  if (!id) return null;
  return await getCache<CaseDraft>(draftKey(id));
}

export async function deleteDraft(id: string): Promise<void> {
  await delCache(draftKey(id));
}
