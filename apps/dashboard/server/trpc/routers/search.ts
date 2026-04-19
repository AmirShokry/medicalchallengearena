import { z } from "zod";
import { authProcedure, createTRPCRouter } from "../init";
import {
  and,
  db,
  eq,
  desc,
  sql,
  type SQL,
  type AnyColumn,
} from "@package/database";
import { TRPCError } from "@trpc/server";

/**
 * True full-text search across cases, questions and choices.
 *
 * Uses Postgres native FTS (`to_tsvector` + `to_tsquery`) so matching
 * is word-based rather than substring-based, but stays **strict** —
 * there is no fuzzy / typo tolerance.
 *
 * Each user-supplied word becomes a prefix term (`word:*`) so that
 * partial words still match (e.g. typing `diab` matches `diabetes`),
 * but a misspelled word will not match.
 */

/**
 * Build a Postgres tsquery string from raw user input.
 * Returns `null` when no usable tokens remain (caller should
 * short-circuit with no matches).
 */
function buildTsQueryString(raw: string): string | null {
  const tokens = raw
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

const scopeEnum = z.enum([
  "all",
  "case",
  "question",
  "choice",
  "explanation",
  "choice_explanation",
]);
const stepEnum = z.enum(["STEP 1", "STEP 2", "STEP 3"]);

const searchInput = z.object({
  q: z.string().trim().min(1, "Search query is required"),
  scope: scopeEnum.default("all"),
  systemId: z.number().int().nullable().optional(),
  categoryId: z.number().int().nullable().optional(),
  caseType: stepEnum.nullable().optional(),
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

type FieldMode = "all" | "body" | "explanation";

type SearchInput = z.infer<typeof searchInput>;

export type SearchKind = "case" | "question" | "choice";
export type MatchedField = "body" | "explanation";

export interface SearchResult {
  kind: SearchKind;
  caseId: number;
  questionId: number | null;
  choiceId: number | null;
  matchedField: MatchedField;
  /** The text that actually matched (body or explanation, depending on `matchedField`). */
  matchedText: string;
  caseBody: string;
  questionBody: string | null;
  choiceBody: string | null;
  systemId: number;
  systemName: string;
  categoryId: number | null;
  categoryName: string | null;
  caseType: "STEP 1" | "STEP 2" | "STEP 3";
}

// ---------------------------------------------------------------------------
// FTS helpers
// ---------------------------------------------------------------------------

/** tsvector built from one or more text expressions (NULLs coerced to ''). */
function tsv(...exprs: Array<SQL | AnyColumn>) {
  const concat = exprs
    .map((e) => sql`coalesce(${e}, '')`)
    .reduce((acc, cur, i) => (i === 0 ? cur : sql`${acc} || ' ' || ${cur}`));
  return sql`to_tsvector('simple', ${concat})`;
}

/**
 * Caller passes the *already-built* tsquery string (from `buildTsQueryString`).
 * Using `'simple'` config + `to_tsquery` keeps matching strict (no stemming
 * surprises) while the `:*` suffix on each token gives substring-friendly
 * prefix matching.
 */
function tsq(qStr: string) {
  return sql`to_tsquery('simple', ${qStr})`;
}

function tsMatch(text: SQL | AnyColumn, qStr: string) {
  return sql`${tsv(text)} @@ ${tsq(qStr)}`;
}

function tsMatchAny(texts: Array<SQL | AnyColumn>, qStr: string) {
  return sql`${tsv(...texts)} @@ ${tsq(qStr)}`;
}

function tsRank(texts: Array<SQL | AnyColumn>, qStr: string) {
  return sql<number>`ts_rank(${tsv(...texts)}, ${tsq(qStr)})`;
}

function buildContextFilters(opts: {
  systemId?: number | null;
  categoryId?: number | null;
  caseType?: "STEP 1" | "STEP 2" | "STEP 3" | null;
}): SQL[] {
  const conds: SQL[] = [];
  if (opts.systemId != null)
    conds.push(eq(db.table.systems.id, opts.systemId));
  if (opts.categoryId != null)
    conds.push(eq(db.table.categories.id, opts.categoryId));
  if (opts.caseType != null)
    conds.push(eq(db.table.cases.type, opts.caseType));
  return conds;
}

// ---------------------------------------------------------------------------
// Per-kind queries
// ---------------------------------------------------------------------------

async function searchCases(input: SearchInput, qStr: string) {
  // Cases only have `body` to match against — no explanation field.
  const where = and(
    tsMatch(db.table.cases.body, qStr),
    ...buildContextFilters(input)
  );

  const rank = tsRank([db.table.cases.body], qStr).as("rank");

  const rows = await db
    .select({
      caseId: db.table.cases.id,
      caseBody: db.table.cases.body,
      caseType: db.table.cases.type,
      systemId: db.table.systems.id,
      systemName: db.table.systems.name,
      categoryId: db.table.categories.id,
      categoryName: db.table.categories.name,
      rank,
    })
    .from(db.table.cases)
    .leftJoin(
      db.table.categories,
      eq(db.table.cases.category_id, db.table.categories.id)
    )
    .leftJoin(
      db.table.systems,
      eq(db.table.categories.system_id, db.table.systems.id)
    )
    .where(where)
    .orderBy(desc(rank), desc(db.table.cases.id))
    .limit(input.limit)
    .offset(input.offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(db.table.cases)
    .leftJoin(
      db.table.categories,
      eq(db.table.cases.category_id, db.table.categories.id)
    )
    .leftJoin(
      db.table.systems,
      eq(db.table.categories.system_id, db.table.systems.id)
    )
    .where(where);

  const results: SearchResult[] = rows.map((r) => ({
    kind: "case",
    caseId: r.caseId,
    questionId: null,
    choiceId: null,
    matchedField: "body",
    matchedText: r.caseBody,
    caseBody: r.caseBody,
    questionBody: null,
    choiceBody: null,
    systemId: r.systemId!,
    systemName: r.systemName!,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    caseType: r.caseType,
  }));

  return { results, totalCount: Number(count) };
}

async function searchQuestions(
  input: SearchInput,
  qStr: string,
  mode: FieldMode
) {
  // Question matches consider the question body and/or the per-question
  // explanation stored on the `cases_questions` junction, depending on
  // `mode`.
  const cols =
    mode === "body"
      ? [db.table.questions.body]
      : mode === "explanation"
        ? [db.table.cases_questions.explanation]
        : [db.table.questions.body, db.table.cases_questions.explanation];
  const matchExpr = tsMatchAny(cols, qStr);
  const rank = tsRank(cols, qStr).as("rank");

  // Pick the field that actually matched. When the mode is restricted, the
  // result is forced; otherwise body wins on ties.
  const matchedField =
    mode === "body"
      ? sql<MatchedField>`'body'::text`.as("matched_field")
      : mode === "explanation"
        ? sql<MatchedField>`'explanation'::text`.as("matched_field")
        : sql<MatchedField>`(CASE WHEN ${tsMatch(
            db.table.questions.body,
            qStr
          )} THEN 'body' ELSE 'explanation' END)`.as("matched_field");

  const where = and(matchExpr, ...buildContextFilters(input));

  const rows = await db
    .select({
      questionId: db.table.questions.id,
      questionBody: db.table.questions.body,
      explanation: db.table.cases_questions.explanation,
      caseId: db.table.cases.id,
      caseBody: db.table.cases.body,
      caseType: db.table.cases.type,
      systemId: db.table.systems.id,
      systemName: db.table.systems.name,
      categoryId: db.table.categories.id,
      categoryName: db.table.categories.name,
      matchedField,
      rank,
    })
    .from(db.table.questions)
    .innerJoin(
      db.table.cases_questions,
      eq(db.table.cases_questions.question_id, db.table.questions.id)
    )
    .innerJoin(
      db.table.cases,
      eq(db.table.cases_questions.case_id, db.table.cases.id)
    )
    .leftJoin(
      db.table.categories,
      eq(db.table.cases.category_id, db.table.categories.id)
    )
    .leftJoin(
      db.table.systems,
      eq(db.table.categories.system_id, db.table.systems.id)
    )
    .where(where)
    .orderBy(desc(rank), desc(db.table.cases.id), desc(db.table.questions.id))
    .limit(input.limit)
    .offset(input.offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(db.table.questions)
    .innerJoin(
      db.table.cases_questions,
      eq(db.table.cases_questions.question_id, db.table.questions.id)
    )
    .innerJoin(
      db.table.cases,
      eq(db.table.cases_questions.case_id, db.table.cases.id)
    )
    .leftJoin(
      db.table.categories,
      eq(db.table.cases.category_id, db.table.categories.id)
    )
    .leftJoin(
      db.table.systems,
      eq(db.table.categories.system_id, db.table.systems.id)
    )
    .where(where);

  const results: SearchResult[] = rows.map((r) => ({
    kind: "question",
    caseId: r.caseId,
    questionId: r.questionId,
    choiceId: null,
    matchedField: r.matchedField,
    matchedText:
      r.matchedField === "body" ? r.questionBody : r.explanation ?? "",
    caseBody: r.caseBody,
    questionBody: r.questionBody,
    choiceBody: null,
    systemId: r.systemId!,
    systemName: r.systemName!,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    caseType: r.caseType,
  }));

  return { results, totalCount: Number(count) };
}

async function searchChoices(
  input: SearchInput,
  qStr: string,
  mode: FieldMode
) {
  // Choice matches consider the choice body and/or the per-choice
  // explanation stored on `questions_choices`, depending on `mode`.
  const cols =
    mode === "body"
      ? [db.table.choices.body]
      : mode === "explanation"
        ? [db.table.questions_choices.explanation]
        : [db.table.choices.body, db.table.questions_choices.explanation];
  const matchExpr = tsMatchAny(cols, qStr);
  const rank = tsRank(cols, qStr).as("rank");
  const matchedField =
    mode === "body"
      ? sql<MatchedField>`'body'::text`.as("matched_field")
      : mode === "explanation"
        ? sql<MatchedField>`'explanation'::text`.as("matched_field")
        : sql<MatchedField>`(CASE WHEN ${tsMatch(
            db.table.choices.body,
            qStr
          )} THEN 'body' ELSE 'explanation' END)`.as("matched_field");

  const where = and(matchExpr, ...buildContextFilters(input));

  const rows = await db
    .select({
      choiceId: db.table.choices.id,
      choiceBody: db.table.choices.body,
      explanation: db.table.questions_choices.explanation,
      questionId: db.table.questions.id,
      questionBody: db.table.questions.body,
      caseId: db.table.cases.id,
      caseBody: db.table.cases.body,
      caseType: db.table.cases.type,
      systemId: db.table.systems.id,
      systemName: db.table.systems.name,
      categoryId: db.table.categories.id,
      categoryName: db.table.categories.name,
      matchedField,
      rank,
    })
    .from(db.table.choices)
    .innerJoin(
      db.table.questions_choices,
      eq(db.table.questions_choices.choice_id, db.table.choices.id)
    )
    .innerJoin(
      db.table.questions,
      eq(db.table.questions_choices.question_id, db.table.questions.id)
    )
    .innerJoin(
      db.table.cases_questions,
      eq(db.table.cases_questions.question_id, db.table.questions.id)
    )
    .innerJoin(
      db.table.cases,
      eq(db.table.cases_questions.case_id, db.table.cases.id)
    )
    .leftJoin(
      db.table.categories,
      eq(db.table.cases.category_id, db.table.categories.id)
    )
    .leftJoin(
      db.table.systems,
      eq(db.table.categories.system_id, db.table.systems.id)
    )
    .where(where)
    .orderBy(
      desc(rank),
      desc(db.table.cases.id),
      desc(db.table.questions.id),
      desc(db.table.choices.id)
    )
    .limit(input.limit)
    .offset(input.offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(db.table.choices)
    .innerJoin(
      db.table.questions_choices,
      eq(db.table.questions_choices.choice_id, db.table.choices.id)
    )
    .innerJoin(
      db.table.questions,
      eq(db.table.questions_choices.question_id, db.table.questions.id)
    )
    .innerJoin(
      db.table.cases_questions,
      eq(db.table.cases_questions.question_id, db.table.questions.id)
    )
    .innerJoin(
      db.table.cases,
      eq(db.table.cases_questions.case_id, db.table.cases.id)
    )
    .leftJoin(
      db.table.categories,
      eq(db.table.cases.category_id, db.table.categories.id)
    )
    .leftJoin(
      db.table.systems,
      eq(db.table.categories.system_id, db.table.systems.id)
    )
    .where(where);

  const results: SearchResult[] = rows.map((r) => ({
    kind: "choice",
    caseId: r.caseId,
    questionId: r.questionId,
    choiceId: r.choiceId,
    matchedField: r.matchedField,
    matchedText: r.matchedField === "body" ? r.choiceBody : r.explanation ?? "",
    caseBody: r.caseBody,
    questionBody: r.questionBody,
    choiceBody: r.choiceBody,
    systemId: r.systemId!,
    systemName: r.systemName!,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    caseType: r.caseType,
  }));

  return { results, totalCount: Number(count) };
}

export const search = createTRPCRouter({
  list: authProcedure.input(searchInput).query(async ({ input }) => {
    const qStr = buildTsQueryString(input.q);
    if (!qStr) return emptyResult(input);

    if (input.scope === "case") {
      const { results, totalCount } = await searchCases(input, qStr);
      return paginated(results, totalCount, input);
    }
    if (input.scope === "question") {
      const { results, totalCount } = await searchQuestions(
        input,
        qStr,
        "body"
      );
      return paginated(results, totalCount, input);
    }
    if (input.scope === "choice") {
      const { results, totalCount } = await searchChoices(input, qStr, "body");
      return paginated(results, totalCount, input);
    }
    if (input.scope === "explanation") {
      const { results, totalCount } = await searchQuestions(
        input,
        qStr,
        "explanation"
      );
      return paginated(results, totalCount, input);
    }
    if (input.scope === "choice_explanation") {
      const { results, totalCount } = await searchChoices(
        input,
        qStr,
        "explanation"
      );
      return paginated(results, totalCount, input);
    }

    // scope === "all" — fan out, return top-N per kind unpaginated.
    const perKindLimit = Math.max(5, Math.floor(input.limit / 3));
    const allInput = { ...input, limit: perKindLimit, offset: 0 };

    const [casesRes, questionsRes, choicesRes] = await Promise.all([
      searchCases(allInput, qStr),
      searchQuestions(allInput, qStr, "all"),
      searchChoices(allInput, qStr, "all"),
    ]);

    const merged = [
      ...casesRes.results,
      ...questionsRes.results,
      ...choicesRes.results,
    ];
    const totalCount =
      casesRes.totalCount + questionsRes.totalCount + choicesRes.totalCount;

    return {
      results: merged,
      totalCount,
      perKindCounts: {
        case: casesRes.totalCount,
        question: questionsRes.totalCount,
        choice: choicesRes.totalCount,
      },
      hasMore: false,
      currentPage: 1,
      totalPages: 1,
    };
  }),

  /**
   * Delete the entire case that contains the matched item.
   * Granular per-question / per-choice deletion is intentionally not
   * supported here because the case has structural invariants
   * (≥ 2 choices, ≥ 1 correct) — use the entry editor for partial edits.
   */
  deleteCase: authProcedure
    .input(z.object({ caseId: z.number().int() }))
    .mutation(async ({ input }) => {
      const existing = await db
        .select({ id: db.table.cases.id })
        .from(db.table.cases)
        .where(eq(db.table.cases.id, input.caseId))
        .limit(1);
      if (!existing.length)
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });

      await db
        .delete(db.table.cases)
        .where(eq(db.table.cases.id, input.caseId));

      return { success: true };
    }),
});

function paginated(
  results: SearchResult[],
  totalCount: number,
  input: SearchInput
) {
  return {
    results,
    totalCount,
    perKindCounts: undefined as
      | undefined
      | { case: number; question: number; choice: number },
    hasMore: input.offset + input.limit < totalCount,
    currentPage: Math.floor(input.offset / input.limit) + 1,
    totalPages: Math.max(1, Math.ceil(totalCount / input.limit)),
  };
}

function emptyResult(input: SearchInput) {
  return {
    results: [] as SearchResult[],
    totalCount: 0,
    perKindCounts:
      input.scope === "all"
        ? { case: 0, question: 0, choice: 0 }
        : undefined,
    hasMore: false,
    currentPage: 1,
    totalPages: 1,
  };
}
