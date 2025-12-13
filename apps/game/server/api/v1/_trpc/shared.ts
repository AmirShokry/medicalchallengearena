import { db, getTableColumns, sql, inArray, and, eq } from "@package/database";
import { jsonAggBuildObject } from "@package/database/helpers";
import {
  QuestionsChoicesCTE,
  SolvedCasesIdsCTEGenerator,
  UnusedCasesGeneratorCTE,
} from "@package/database/ctes";
import { z } from "zod";
export const allBlockByCategoriesIdsSchema = z.object({
  categoriesIds: z.array(z.number().min(1)),
  options: z
    .object({
      count: z.number().min(1).default(10),
      studyMode: z.boolean().default(false),
    })
    .default({ count: 10, studyMode: false }),
});
export async function allBlockByCategoriesIds(
  input: z.infer<typeof allBlockByCategoriesIdsSchema>
) {
  const { cases_questions, cases, categories } = db.table;
  const { case_id, question_id, ...cases_questions_columns } =
    getTableColumns(cases_questions);

  return await db
    .with(QuestionsChoicesCTE)
    .select({
      ...getTableColumns(cases),
      questions: jsonAggBuildObject({
        ...QuestionsChoicesCTE._.selectedFields,
        ...cases_questions_columns,
        imgUrls: sql<
          string[]
        >` COALESCE(${cases_questions_columns.imgUrls}, ARRAY[]::text[])`,
        explanationImgUrls: sql<
          string[]
        >` COALESCE(${cases_questions_columns.explanationImgUrls}, ARRAY[]::text[])`,
      }).as("questions"),
    })
    .from(cases_questions)
    .innerJoin(cases, eq(cases_questions.case_id, cases.id))
    .innerJoin(categories, eq(cases.category_id, categories.id))
    .where(inArray(categories.id, input.categoriesIds))
    .innerJoin(
      QuestionsChoicesCTE,
      and(
        eq(cases_questions.question_id, QuestionsChoicesCTE.id),
        eq(cases_questions.isStudyMode, input.options.studyMode)
      )
    )
    .groupBy(cases.id)
    .orderBy(sql`RANDOM()`)
    .limit(input.options.count);
}

export const unusedBlockByCategoriesIdsSchema = z.object({
  categoriesIds: z.array(z.number().min(1)),
  userId: z.number().min(1),
  opponentId: z.number().min(1),
  options: z.object({
    count: z.number().min(1).default(10),
    studyMode: z.boolean().default(false),
  }),
});

export async function unusedBlockByCategoriesIds(
  input: z.infer<typeof unusedBlockByCategoriesIdsSchema>
) {
  const { cases_questions, cases, categories } = db.table;
  const SolvedCasesIdsCTE = SolvedCasesIdsCTEGenerator(
    input.userId,
    input.opponentId
  );
  const UnusedCasesIdsCTE = UnusedCasesGeneratorCTE(
    SolvedCasesIdsCTE,
    input.options.count
  );
  const { case_id, question_id, ...cases_questions_columns } =
    getTableColumns(cases_questions);
  return await db
    .with(QuestionsChoicesCTE, UnusedCasesIdsCTE)
    .select({
      ...getTableColumns(cases),
      questions: jsonAggBuildObject({
        ...QuestionsChoicesCTE._.selectedFields,
        ...cases_questions_columns,
        imgUrls: sql<
          string[]
        >` COALESCE(${cases_questions_columns.imgUrls}, ARRAY[]::text[])`,
        explanationImgUrls: sql<
          string[]
        >` COALESCE(${cases_questions_columns.explanationImgUrls}, ARRAY[]::text[])`,
      }).as("questions"),
    })
    .from(cases_questions)
    .innerJoin(cases, eq(cases_questions.case_id, cases.id))
    .innerJoin(
      UnusedCasesIdsCTE,
      eq(cases.id, UnusedCasesIdsCTE.unused_case_id)
    )
    .innerJoin(categories, eq(cases.category_id, categories.id))
    .where(inArray(categories.id, input.categoriesIds))
    .innerJoin(
      QuestionsChoicesCTE,
      and(eq(cases_questions.question_id, QuestionsChoicesCTE.id))
    )
    .groupBy(cases.id)
    .orderBy(sql`RANDOM()`)
    .limit(input.options.count);
}
