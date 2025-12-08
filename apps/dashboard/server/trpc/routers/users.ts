import { TRPCError } from "@trpc/server";
import { authProcedure, createTRPCRouter } from "../init";
import {
  db,
  eq,
  sql,
  getTableColumns,
  desc,
  and,
  inArray,
} from "@package/database";
import { jsonAggBuildObject } from "@package/database/helpers";
import { QuestionsChoicesCTE } from "@package/database/ctes";
import z from "zod";

const {
  users,
  users_auth,
  users_games,
  users_cases,
  games,
  cases,
  cases_questions,
} = db.table;

export const usersRouter = createTRPCRouter({
  // Get a single user by ID with all details
  getById: authProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const [user] = await db
        .select({
          ...getTableColumns(users),
          isSubscribed: users_auth.is_subscribed,
          plan: users_auth.plan,
          stripeCustomerId: users_auth.stripe_customer_id,
        })
        .from(users)
        .leftJoin(users_auth, eq(users.id, users_auth.user_id))
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Get additional stats
      const [casesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users_cases)
        .where(eq(users_cases.user_id, input.userId));

      return {
        ...user,
        solvedCasesCount: casesCount?.count || 0,
      };
    }),

  // Get all games for a specific user
  getGames: authProcedure
    .input(
      z.object({
        userId: z.number(),
        page: z.number().int().min(0).default(0).optional(),
        mode: z.enum(["single", "unranked"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const pageSize = 10;
      const offset = input.page ? input.page * pageSize : 0;

      // Base query for total count
      const countConditions = input.mode
        ? and(
            eq(users_games.userId, input.userId),
            eq(users_games.gameId, games.id),
            eq(games.mode, input.mode)
          )
        : and(
            eq(users_games.userId, input.userId),
            eq(users_games.gameId, games.id)
          );

      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users_games)
        .innerJoin(games, eq(users_games.gameId, games.id))
        .where(countConditions);

      const totalCount = totalCountResult?.count || 0;

      // Base query for records
      const recordsConditions = input.mode
        ? and(
            eq(users_games.userId, input.userId),
            eq(users_games.gameId, games.id),
            eq(games.mode, input.mode)
          )
        : and(
            eq(users_games.userId, input.userId),
            eq(users_games.gameId, games.id)
          );

      const records = await db
        .select({
          gameId: users_games.gameId,
          hasWon: users_games.hasWon,
          opponentId: users_games.opponentId,
          opponentUsername: users.username,
          opponentAvatarUrl: users.avatarUrl,
          mode: games.mode,
          date: games.createdAt,
          durationMs: users_games.durationMs,
        })
        .from(users_games)
        .innerJoin(games, eq(users_games.gameId, games.id))
        .leftJoin(users, eq(users_games.opponentId, users.id))
        .where(recordsConditions)
        .orderBy(desc(games.id))
        .limit(pageSize)
        .offset(offset);

      return {
        records,
        hasMore: offset + records.length < totalCount,
        totalCount,
        currentPage: Math.floor(offset / pageSize) + 1,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    }),

  // Get game review data for a specific user and game
  getGameReview: authProcedure
    .input(z.object({ userId: z.number(), gameId: z.number() }))
    .query(async ({ input }) => {
      const [returnVal] = await db
        .select({ reviewData: users_games.data })
        .from(users_games)
        .where(
          and(
            eq(users_games.gameId, input.gameId),
            eq(users_games.userId, input.userId)
          )
        );

      const reviewData = returnVal?.reviewData;
      if (!reviewData || !reviewData.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review data not found",
        });
      }

      // Get case IDs from the review data
      const caseIds = [...new Set(reviewData.map((r) => r.caseId))];

      // Build the CTE for cases with questions and choices
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
                ...getTableColumns(cases_questions),
                imgUrls: sql<
                  string[]
                >` COALESCE(${cases_questions.imgUrls}, ARRAY[]::text[])`,
                explanationImgUrls: sql<
                  string[]
                >` COALESCE(${cases_questions.explanationImgUrls}, ARRAY[]::text[])`,
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

      const casesData = await db
        .with(CaseQuestionChoicesWithStudyModeFlag)
        .select({
          ...CaseQuestionChoicesWithStudyModeFlag._.selectedFields,
        })
        .from(CaseQuestionChoicesWithStudyModeFlag)
        .where(inArray(CaseQuestionChoicesWithStudyModeFlag.id, caseIds));

      return { reviewData, cases: casesData };
    }),

  // Reset all user_cases for a user
  resetUserCases: authProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db
        .delete(users_cases)
        .where(eq(users_cases.user_id, input.userId))
        .returning();

      return {
        success: true,
        deletedCount: result.length,
      };
    }),

  // Toggle subscription status for a user
  toggleSubscription: authProcedure
    .input(z.object({ userId: z.number(), isSubscribed: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(users_auth)
        .set({ is_subscribed: input.isSubscribed })
        .where(eq(users_auth.user_id, input.userId));
      return { success: true };
    }),
});
