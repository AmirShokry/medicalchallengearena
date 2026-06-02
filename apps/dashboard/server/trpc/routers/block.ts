import { z } from "zod";
import { authProcedure, createTRPCRouter } from "../init";
import { and, db, eq, sql, inArray, desc } from "@package/database";
import type { SQL, AnyColumn } from "@package/database";
import { CasesQuestionsChoicesCTE } from "@package/database/ctes";
import { TRPCError } from "@trpc/server";
import { inputSchema, xmlImportSchema } from "@/shared/schema/input";
import type { XmlCaseInput, XmlImportInput } from "@/shared/schema/input";
import { getCache, setCache, delCache } from "@package/redis";

/** Transaction handle type, as handed to the `db.transaction` callback. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const block = createTRPCRouter({
  get: authProcedure
    .input(
      z.object({
        system: z.string(),
        category: z.string(),
        caseType: z.enum(["STEP 1", "STEP 2", "STEP 3"]),
      })
    )
    .query(async ({ input }) => {
      const result = await db
        .with(CasesQuestionsChoicesCTE)
        .select()
        .from(CasesQuestionsChoicesCTE)
        .where(
          and(
            eq(
              CasesQuestionsChoicesCTE.category_id,
              db
                .selectDistinct({ id: db.table.categories.id })
                .from(db.table.systems)
                .innerJoin(
                  db.table.categories,
                  eq(db.table.systems.id, db.table.categories.system_id)
                )
                .where(
                  and(
                    eq(db.table.systems.name, input.system),
                    eq(db.table.categories.name, input.category)
                  )
                )
                .limit(1)
            ),
            eq(CasesQuestionsChoicesCTE.type, input.caseType)
          )
        )
        .orderBy(desc(CasesQuestionsChoicesCTE.id));

      if (!result.length)
        throw new TRPCError({
          message: "System or category not found, or they are not related",
          code: "NOT_FOUND",
        });

      return result;
    }),
  add: authProcedure
    .input(
      z.object({
        body: z.string().trim().min(1, "Case cannot be empty"),
        type: z.enum(["STEP 1", "STEP 2", "STEP 3"], {
          message: "Case type is required",
        }),
        imgUrls: z.array(z.string()).optional().default([]),
        category_id: z.number().int().nullable(),
        questions: z.array(
          z.object({
            type: z.enum(["Default", "Tabular"], {
              message: "Question type is required",
            }),
            body: z.string().trim().min(1, "Question cannot be empty"),
            header: z.string().optional().nullable(),
            imgUrls: z.array(z.string()).optional().default([]),
            isStudyMode: z.boolean().optional().nullable().default(false),
            explanation: z
              .string()
              .trim()
              .min(1, "Explanation cannot be empty"),
            explanationImgUrls: z.array(z.string()).optional().default([]),

            choices: z
              .array(
                z.object({
                  body: z.string().trim().min(1, "Choice cannot be empty"),
                  isCorrect: z.boolean().optional().nullable(),
                  explanation: z.string().optional().nullable(),
                })
              )
              .min(2, "At least 2 choices are required")
              .refine(
                (choices) => choices.some((choice) => choice.isCorrect),
                "At least one choice must be marked as correct"
              ),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      return await db.transaction(async (tx) => {
        const [caseResult] = await tx
          .insert(db.table.cases)
          .values({
            body: input.body,
            type: input.type,
            imgUrls: input.imgUrls || [],
            category_id: input.category_id,
          })
          .returning();

        if (!caseResult || !caseResult.id) {
          throw new TRPCError({
            message: "Failed to add case",
            code: "INTERNAL_SERVER_ERROR",
          });
        }

        const questionValues = input.questions.map((question) => ({
          case_id: caseResult.id,
          type: question.type,
          body: question.body,
          header: question.header || null,
        }));

        const questionsResults = await tx
          .insert(db.table.questions)
          .values(questionValues)
          .returning();

        if (!questionsResults.length)
          throw new TRPCError({
            message: "Failed to add questions",
            code: "INTERNAL_SERVER_ERROR",
          });

        const casesQuestionsValues = input.questions.map((question, index) => ({
          case_id: caseResult.id,
          question_id: questionsResults[index].id,
          imgUrls: question.imgUrls,
          isStudyMode: question.isStudyMode,
          explanation: question.explanation,
          explanationImgUrls: question.explanationImgUrls,
        }));

        const choicesValues = input.questions.flatMap((question) =>
          question.choices.map((choice) => ({
            body: choice.body,
          }))
        );

        const casesQuestionsResults = await tx
          .insert(db.table.cases_questions)
          .values(casesQuestionsValues)
          .returning();

        if (!casesQuestionsResults.length)
          throw new TRPCError({
            message: "Failed to assign cases questions",
            code: "INTERNAL_SERVER_ERROR",
          });

        const choicesResults = await tx
          .insert(db.table.choices)
          .values(choicesValues)
          .returning();
        if (!choicesResults.length) {
          throw new TRPCError({
            message: "Failed to add choices",
            code: "INTERNAL_SERVER_ERROR",
          });
        }

        // Calculate questionsChoicesValues with proper accumulated indexing
        // choicesResults is a flat array of all choices, so we need to track the offset
        const questionsChoicesValues: Array<{
          question_id: number;
          choice_id: number;
          isCorrect: boolean;
          explanation: string | null;
        }> = [];

        let choiceOffset = 0;
        for (
          let questionIndex = 0;
          questionIndex < input.questions.length;
          questionIndex++
        ) {
          const question = input.questions[questionIndex];
          for (
            let choiceIndex = 0;
            choiceIndex < question.choices.length;
            choiceIndex++
          ) {
            const choice = question.choices[choiceIndex];
            questionsChoicesValues.push({
              question_id: questionsResults[questionIndex].id,
              choice_id: choicesResults[choiceOffset + choiceIndex].id,
              isCorrect: choice.isCorrect || false,
              explanation: choice.explanation || null,
            });
          }
          choiceOffset += question.choices.length;
        }

        const questionsChoicesResults = await tx
          .insert(db.table.questions_choices)
          .values(questionsChoicesValues)
          .returning();
        if (!questionsChoicesResults.length) {
          throw new TRPCError({
            message: "Failed to assign questions choices",
            code: "INTERNAL_SERVER_ERROR",
          });
        }

        return {
          ...caseResult,
          questions: questionsResults.map((question, qIndex) => {
            // Calculate start and end index for choices of this question
            const choicesCount = input.questions[qIndex].choices.length;
            const start = input.questions
              .slice(0, qIndex)
              .reduce((acc, q) => acc + q.choices.length, 0);
            const end = start + choicesCount;

            return {
              ...question,
              ...casesQuestionsResults[qIndex],
              choices: choicesResults
                .slice(start, end)
                .map((choice, cIndex) => ({
                  ...choice,
                  ...questionsChoicesResults[start + cIndex],
                })),
            };
          }),
        };
      });
    }),

  /**
   * Bulk-insert many cases from the text-editor (XML) mode in ONE transaction.
   * All-or-nothing: if any case fails, the whole batch rolls back. `type`
   * (STEP) and `category_id` come from the page and apply to every case.
   */
  addMany: authProcedure
    .input(xmlImportSchema)
    .mutation(async ({ input }) => {
      return await db.transaction(async (tx) => {
        const created = [];
        for (const caseInput of input.cases) {
          created.push(
            await insertCaseInTx(tx, caseInput, input.type, input.category_id)
          );
        }
        return created;
      });
    }),

  update: authProcedure.input(inputSchema).mutation(async ({ input }) => {
    await db.transaction(async (tx) => {
      // 1️⃣ Update main case
      await tx
        .update(db.table.cases)
        .set({
          body: input.body,
          type: input.type,
          imgUrls: input.imgUrls || [],
          category_id: input.category_id,
        })
        .where(eq(db.table.cases.id, input.id));

      // 2️⃣ Get existing question and choice IDs from database
      const existingQuestions = await tx
        .select({ id: db.table.questions.id })
        .from(db.table.questions);
      const existingChoices = await tx
        .select({ id: db.table.choices.id })
        .from(db.table.choices);

      const existingQuestionIds = new Set(existingQuestions.map((q) => q.id));
      const existingChoiceIds = new Set(existingChoices.map((c) => c.id));

      // 3️⃣ Separate new vs existing questions
      const newQuestions = input.questions.filter(
        (q) => !existingQuestionIds.has(q.id)
      );
      const existingQuestionsToUpdate = input.questions.filter((q) =>
        existingQuestionIds.has(q.id)
      );

      // 4️⃣ Insert new questions and get their IDs
      const questionIdMapping = new Map<number, number>(); // old ID -> new ID

      if (newQuestions.length > 0) {
        const questionsValues = newQuestions.map((question) => ({
          body: question.body,
          type: question.type,
          header: question.header,
        }));

        const questionsResults = await tx
          .insert(db.table.questions)
          .values(questionsValues)
          .returning();

        // Map old IDs to new IDs
        newQuestions.forEach((question, index) => {
          questionIdMapping.set(question.id, questionsResults[index].id);
        });
      }

      // 5️⃣ Update existing questions
      if (existingQuestionsToUpdate.length > 0) {
        const existingQuestionIds = existingQuestionsToUpdate.map((q) => q.id);

        await tx
          .update(db.table.questions)
          .set({
            type: buildCaseSql(
              existingQuestionsToUpdate,
              db.table.questions.id,
              "type",
              db.table.questions.type
            ),
            body: buildCaseSql(
              existingQuestionsToUpdate,
              db.table.questions.id,
              "body",
              db.table.questions.body
            ),
            header: buildCaseSql(
              existingQuestionsToUpdate,
              db.table.questions.id,
              "header",
              db.table.questions.header
            ),
          })
          .where(inArray(db.table.questions.id, existingQuestionIds));
      }

      // 6️⃣ Handle choices (separate new vs existing)
      // First, let's add unique identifiers to choices to avoid ID conflicts
      const allChoicesWithUniqueKeys = input.questions.flatMap(
        (q, questionIndex) =>
          q.choices.map((choice, choiceIndex) => ({
            ...choice,
            questionId: questionIdMapping.get(q.id) || q.id,
            uniqueKey: `${q.id}-${choiceIndex}`, // Create unique key based on question and position
            originalQuestionId: q.id,
            originalChoiceId: choice.id,
          }))
      );

      const newChoices = allChoicesWithUniqueKeys.filter(
        (c) => !existingChoiceIds.has(c.originalChoiceId)
      );
      const existingChoicesToUpdate = allChoicesWithUniqueKeys.filter((c) =>
        existingChoiceIds.has(c.originalChoiceId)
      );

      // 7️⃣ Insert new choices and get their IDs
      const choiceIdMapping = new Map<string, number>(); // uniqueKey -> new ID

      if (newChoices.length > 0) {
        const choicesValues = newChoices.map((choice) => ({
          body: choice.body,
        }));

        const choicesResults = await tx
          .insert(db.table.choices)
          .values(choicesValues)
          .returning();

        // Map unique keys to new IDs
        newChoices.forEach((choice, index) => {
          choiceIdMapping.set(choice.uniqueKey, choicesResults[index].id);
        });
      }

      // 8️⃣ Update existing choices
      if (existingChoicesToUpdate.length > 0) {
        const existingChoiceIds = existingChoicesToUpdate.map(
          (c) => c.originalChoiceId
        );

        await tx
          .update(db.table.choices)
          .set({
            body: buildCaseSql(
              existingChoicesToUpdate.map((c) => ({
                ...c,
                id: c.originalChoiceId,
              })),
              db.table.choices.id,
              "body",
              db.table.choices.body
            ),
          })
          .where(inArray(db.table.choices.id, existingChoiceIds));
      }

      // 9️⃣ Handle cases_questions relationships
      const allQuestionsWithMappedIds = input.questions.map((q) => ({
        ...q,
        id: questionIdMapping.get(q.id) || q.id, // Use mapped ID if it's a new question
      }));

      // Delete existing cases_questions for this case and insert fresh ones
      await tx
        .delete(db.table.cases_questions)
        .where(eq(db.table.cases_questions.case_id, input.id));

      const casesQuestionsValues = allQuestionsWithMappedIds.map(
        (question) => ({
          case_id: input.id,
          question_id: question.id,
          imgUrls: question.imgUrls,
          isStudyMode: question.isStudyMode,
          explanation: question.explanation,
          explanationImgUrls: question.explanationImgUrls,
        })
      );

      await tx.insert(db.table.cases_questions).values(casesQuestionsValues);

      // 🔟 Handle questions_choices relationships
      // Delete existing questions_choices for all questions and insert fresh ones
      const allQuestionIds = allQuestionsWithMappedIds.map((q) => q.id);
      await tx
        .delete(db.table.questions_choices)
        .where(inArray(db.table.questions_choices.question_id, allQuestionIds));

      // Create the questions_choices values properly mapped
      const questionsChoicesValues: Array<{
        question_id: number;
        choice_id: number;
        isCorrect: boolean;
        explanation: string | null;
      }> = [];

      for (
        let questionIndex = 0;
        questionIndex < input.questions.length;
        questionIndex++
      ) {
        const question = input.questions[questionIndex];
        const mappedQuestionId =
          questionIdMapping.get(question.id) || question.id;

        for (
          let choiceIndex = 0;
          choiceIndex < question.choices.length;
          choiceIndex++
        ) {
          const choice = question.choices[choiceIndex];
          const uniqueKey = `${question.id}-${choiceIndex}`;

          // Get mapped choice ID - either from new insertions or use original ID for existing choices
          let mappedChoiceId: number;
          if (choiceIdMapping.has(uniqueKey)) {
            mappedChoiceId = choiceIdMapping.get(uniqueKey)!;
          } else {
            mappedChoiceId = choice.id; // Use original ID for existing choices
          }

          questionsChoicesValues.push({
            question_id: mappedQuestionId,
            choice_id: mappedChoiceId,
            isCorrect: choice.isCorrect || false,
            explanation: choice.explanation || null,
          });
        }
      }

      if (questionsChoicesValues.length > 0) {
        await tx
          .insert(db.table.questions_choices)
          .values(questionsChoicesValues);
      }
    });
  }),

  delete: authProcedure
    .input(
      z.object({
        caseId: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .delete(db.table.cases)
        .where(eq(db.table.cases.id, input.caseId));
    }),
});

/**
 * Insert a single case (+ its questions, choices and join rows) inside an
 * existing transaction and return the assembled, DB-shaped case — matching the
 * shape produced by `block.add` so the client can render it directly.
 */
async function insertCaseInTx(
  tx: Tx,
  input: XmlCaseInput,
  caseType: XmlImportInput["type"],
  categoryId: number | null
) {
  const [caseResult] = await tx
    .insert(db.table.cases)
    .values({
      body: input.body,
      type: caseType,
      imgUrls: input.imgUrls ?? [],
      category_id: categoryId,
    })
    .returning();

  if (!caseResult || !caseResult.id)
    throw new TRPCError({
      message: "Failed to add case",
      code: "INTERNAL_SERVER_ERROR",
    });

  const questionsResults = await tx
    .insert(db.table.questions)
    .values(
      input.questions.map((q) => ({
        type: q.type,
        body: q.body,
        header: q.header || null,
      }))
    )
    .returning();

  if (!questionsResults.length)
    throw new TRPCError({
      message: "Failed to add questions",
      code: "INTERNAL_SERVER_ERROR",
    });

  const casesQuestionsResults = await tx
    .insert(db.table.cases_questions)
    .values(
      input.questions.map((q, i) => ({
        case_id: caseResult.id,
        question_id: questionsResults[i].id,
        imgUrls: q.imgUrls,
        isStudyMode: q.isStudyMode,
        explanation: q.explanation,
        explanationImgUrls: q.explanationImgUrls,
      }))
    )
    .returning();

  if (!casesQuestionsResults.length)
    throw new TRPCError({
      message: "Failed to assign cases questions",
      code: "INTERNAL_SERVER_ERROR",
    });

  const choicesResults = await tx
    .insert(db.table.choices)
    .values(input.questions.flatMap((q) => q.choices.map((c) => ({ body: c.body }))))
    .returning();

  if (!choicesResults.length)
    throw new TRPCError({
      message: "Failed to add choices",
      code: "INTERNAL_SERVER_ERROR",
    });

  const questionsChoicesValues: Array<{
    question_id: number;
    choice_id: number;
    isCorrect: boolean;
    explanation: string | null;
  }> = [];
  let choiceOffset = 0;
  for (let qi = 0; qi < input.questions.length; qi++) {
    const question = input.questions[qi];
    for (let ci = 0; ci < question.choices.length; ci++) {
      questionsChoicesValues.push({
        question_id: questionsResults[qi].id,
        choice_id: choicesResults[choiceOffset + ci].id,
        isCorrect: question.choices[ci].isCorrect || false,
        explanation: question.choices[ci].explanation || null,
      });
    }
    choiceOffset += question.choices.length;
  }

  const questionsChoicesResults = await tx
    .insert(db.table.questions_choices)
    .values(questionsChoicesValues)
    .returning();

  if (!questionsChoicesResults.length)
    throw new TRPCError({
      message: "Failed to assign questions choices",
      code: "INTERNAL_SERVER_ERROR",
    });

  return {
    ...caseResult,
    questions: questionsResults.map((question, qIndex) => {
      const choicesCount = input.questions[qIndex].choices.length;
      const start = input.questions
        .slice(0, qIndex)
        .reduce((acc, q) => acc + q.choices.length, 0);
      const end = start + choicesCount;
      return {
        ...question,
        ...casesQuestionsResults[qIndex],
        choices: choicesResults.slice(start, end).map((choice, cIndex) => ({
          ...choice,
          ...questionsChoicesResults[start + cIndex],
        })),
      };
    }),
  };
}

function buildCaseSql<T extends { id: string | number }>(
  rows: T[],
  idColumn: AnyColumn,
  field: keyof T,
  column: AnyColumn
): SQL {
  const chunks: SQL[] = [sql`(CASE`];
  for (const row of rows) {
    let value: unknown = row[field];

    // ✅ Handle empty arrays (Postgres `text[]`)
    if (Array.isArray(value)) value = value.length ? value : sql`'{}'::text[]`;
    else if (value === undefined || value === null) value = column; // fallback to existing value

    chunks.push(sql`WHEN ${idColumn} = ${row.id} THEN ${value}`);
  }
  chunks.push(sql`ELSE ${column} END)`);
  return sql.join(chunks, sql.raw(" "));
}
