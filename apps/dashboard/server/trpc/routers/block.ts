import { z } from "zod";
import { authProcedure, createTRPCRouter } from "../init";
import {
  and,
  db,
  eq,
  sql,
  inArray,
  SQL,
  AnyColumn,
  desc,
} from "@package/database";
import { CasesQuestionsChoicesCTE } from "@package/database/ctes";
import { TRPCError } from "@trpc/server";
import { inputSchema } from "@/shared/schema/input";
import { getCache, setCache, delCache } from "@package/redis";

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

        const questionsChoicesValues = input.questions.flatMap(
          (question, questionIndex) =>
            question.choices.map((choice, choiceIndex) => ({
              question_id: questionsResults[questionIndex].id,
              choice_id: choicesResults[choiceIndex].id,
              isCorrect: choice.isCorrect || false,
              explanation: choice.explanation || null,
            }))
        );

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
          questions: questionsResults.map((question, index) => ({
            ...question,
            ...casesQuestionsResults[index],
            choices: choicesResults.map((choice, choiceIndex) => ({
              ...choice,
              ...questionsChoicesResults[choiceIndex],
            })),
          })),
        };
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

      const allChoices = input.questions.flatMap((q) => q.choices);
      const questionIds = input.questions.map((q) => q.id);
      const choiceIds = allChoices.map((c) => c.id);

      // 2️⃣ Update questions
      if (!questionIds.length)
        throw new TRPCError({
          message: "No questions provided for update",
          code: "BAD_REQUEST",
        });
      if (!allChoices.length)
        throw new TRPCError({
          message: "No choices provided for update",
          code: "BAD_REQUEST",
        });

      await tx
        .update(db.table.questions)
        .set({
          type: buildCaseSql(
            input.questions,
            db.table.questions.id,
            "type",
            db.table.questions.type
          ),
          body: buildCaseSql(
            input.questions,
            db.table.questions.id,
            "body",
            db.table.questions.body
          ),
          header: buildCaseSql(
            input.questions,
            db.table.questions.id,
            "header",
            db.table.questions.header
          ),
        })
        .where(inArray(db.table.questions.id, questionIds));

      // 3️⃣ Update cases_questions (scalar + array fields in one batch)

      await tx
        .update(db.table.cases_questions)
        .set({
          isStudyMode: buildCaseSql(
            input.questions,
            db.table.cases_questions.question_id,
            "isStudyMode",
            db.table.cases_questions.isStudyMode
          ),
          explanation: buildCaseSql(
            input.questions,
            db.table.cases_questions.question_id,
            "explanation",
            db.table.cases_questions.explanation
          ),
          imgUrls: buildCaseSql(
            input.questions,
            db.table.cases_questions.question_id,
            "imgUrls",
            db.table.cases_questions.imgUrls
          ),
          explanationImgUrls: buildCaseSql(
            input.questions,
            db.table.cases_questions.question_id,
            "explanationImgUrls",
            db.table.cases_questions.explanationImgUrls
          ),
        })
        .where(
          and(
            eq(db.table.cases_questions.case_id, input.id),
            inArray(db.table.cases_questions.question_id, questionIds)
          )
        );

      // 4️⃣ Update choices and questions_choices

      await tx
        .update(db.table.choices)
        .set({
          body: buildCaseSql(
            allChoices,
            db.table.choices.id,
            "body",
            db.table.choices.body
          ),
        })
        .where(inArray(db.table.choices.id, choiceIds));

      await tx
        .update(db.table.questions_choices)
        .set({
          isCorrect: buildCaseSql(
            allChoices,
            db.table.questions_choices.choice_id,
            "isCorrect",
            db.table.questions_choices.isCorrect
          ),
          explanation: buildCaseSql(
            allChoices,
            db.table.questions_choices.choice_id,
            "explanation",
            db.table.questions_choices.explanation
          ),
        })
        .where(inArray(db.table.questions_choices.choice_id, choiceIds));
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
