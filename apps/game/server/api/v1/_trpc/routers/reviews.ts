import { db, desc, eq, getTableColumns, sql, and } from "@package/database";
import { jsonAggBuildObject } from "@package/database/helpers";
import { QuestionsChoicesCTE } from "@package/database/ctes";
import { TRPCError } from "@trpc/server";
import { authProcedure, createTRPCRouter } from "../init";
import z from "zod";
const { users, users_games, games, cases_questions, cases } = db.table;
const { question_id, case_id, ...cases_questions_columns } =
  getTableColumns(cases_questions);

export const reviews = createTRPCRouter({
  meta: authProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(0).optional(),
        mode: z.enum(["single", "unranked"]),
      })
    )
    .query(async ({ ctx, input }) => {
      return await db
        .select({
          gameId: users_games.gameId,
          userId: users_games.userId,
          hasWon: users_games.hasWon,
          opponentId: users_games.opponentId,
          opoonentUsername: users.username,
          opponentAvatarUrl: users.avatarUrl,
          mode: games.mode,
          date: games.createdAt,
          durationMs: users_games.durationMs,
        })
        .from(users_games)
        .where(eq(users_games.userId, ctx.session?.user.id!))
        .innerJoin(
          games,
          and(eq(users_games.gameId, games.id), eq(games.mode, input.mode))
        )
        .innerJoin(users, eq(users_games.opponentId, users.id))

        .orderBy(desc(games.id))
        .limit(7)
        .offset(input.page ? input.page * 7 : 0);
    }),
  self: authProcedure
    .input(z.object({ gameId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [returnVal] = await db
        .select({ reviewData: users_games.data })
        .from(users_games)
        .where(
          and(
            eq(users_games.gameId, input.gameId),
            eq(users_games.userId, ctx.session?.user.id!)
          )
        );
      const reviewData = returnVal?.reviewData;
      if (!reviewData || !reviewData.length)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "U#2:REVIEW NOT FOUND",
        });

      const cases = await db
        .with(CaseQuestionChoicesWithStudyModeFlag, RecordCaseIds)
        .select({
          ...CaseQuestionChoicesWithStudyModeFlag._.selectedFields,
        })
        .from(RecordCaseIds)
        .where(
          and(
            eq(RecordCaseIds.userId, ctx.session?.user.id!),
            eq(RecordCaseIds.gameId, input.gameId)
          )
        )
        .innerJoin(
          CaseQuestionChoicesWithStudyModeFlag,
          eq(RecordCaseIds.caseId, CaseQuestionChoicesWithStudyModeFlag.id)
        );

      return { reviewData, cases };
    }),
});

const CaseQuestionChoicesWithStudyModeFlag = db
  .$with("CaseQuestionChoicesWithStudyModeFlag")
  .as(
    db
      .with(QuestionsChoicesCTE)
      .select({
        ...getTableColumns(cases),
        hasStudyMode:
          sql<boolean>`EXISTS (SELECT 1 FROM ${cases_questions} WHERE ${cases_questions.case_id} = ${cases.id} AND ${cases_questions.isStudyMode} = true)`.as(
            "hasStudyMode"
          ),
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
      .where(eq(cases_questions.isStudyMode, false))
      .innerJoin(
        QuestionsChoicesCTE,
        eq(cases_questions.question_id, QuestionsChoicesCTE.id)
      )
      .groupBy(cases.id)
  );

const RecordCaseIds = db.$with("RecordCaseIds").as(
  db
    .select({
      gameId: users_games.gameId,
      userId: users_games.userId,
      caseId:
        sql<number>`(jsonb_array_elements(${users_games.data})->>'caseId')::int`.as(
          "caseId"
        ),
    })
    .from(users_games)
);
