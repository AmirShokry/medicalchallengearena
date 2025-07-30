import {
	publicProcedure,
	createTRPCRouter,
	createCallerFactory,
	authProcedure,
} from "../init";
import { UsersRanksCTE } from "@package/database/ctes";
import { and, db, eq, sql } from "@package/database";
import { allBlockByCategoriesIds, unusedBlockByCategoriesIds } from "../shared";
import { type RecordObject } from "@package/types";
import z from "zod";

export const exam = createTRPCRouter({
	startGame: authProcedure
		.input(
			z.object({
				pool: z.enum(["all", "unused"]),
				casesCount: z.number().int().min(1),
				selectedCatIds: z.array(z.number().int().min(1)),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { users_cases, games, users_games } = db.table;
			const cases =
				input.pool === "all"
					? await allBlockByCategoriesIds({
							categoriesIds: input.selectedCatIds,
							options: {
								count: input.casesCount,
								studyMode: false,
							},
						})
					: await unusedBlockByCategoriesIds({
							categoriesIds: input.selectedCatIds,
							userId: ctx.session?.user.id!,
							opponentId: ctx.session?.user.id!,
							options: {
								count: input.casesCount,
								studyMode: false,
							},
						});

			if (!cases.length) throw new Error("No cases found");
			function registerCasesRecord() {
				return cases.flatMap((c, nthCase) =>
					c.questions.map((q) => ({
						caseId: c.id,
						questionId: q.id,
						nthSelectedChoice: -1,
						nthEliminatedChoices: [] as number[],
						isCorrect: false,
						nthCase,
						timeSpentMs: 0,
						medPoints: 0,
					}))
				);
			}

			const emptyCasesRecord = registerCasesRecord();
			const gameId = await db.transaction(async (tx) => {
				await tx
					.insert(users_cases)
					.values(
						cases.flatMap((c) => [
							{ user_id: ctx.session?.user.id!, case_id: c.id },
						])
					)
					.onConflictDoNothing();

				const [{ id }] = await tx
					.insert(games)
					.values([{ mode: "single" }])
					.returning();
				await tx.insert(users_games).values([
					{
						gameId: id,
						userId: ctx.session?.user.id!,
						opponentId: ctx.session?.user.id!,
						hasWon: null,
						durationMs: 0,
						data: emptyCasesRecord,
					},
				]);

				return id;
			});
			return { cases, gameId };
		}),
	endGame: authProcedure
		.input(
			z.object({
				gameId: z.number().int().min(1),
				record: z.custom<RecordObject>(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const serverData = input.record.data.map((d) => {
				const { nthCase, nthQuestion, ...rest } = d;
				return rest;
			});
			const { users, users_games } = db.table;
			await db
				.update(users_games)
				.set({
					data: serverData,
					durationMs: input.record.stats.totalTimeSpentMs,
				})
				.where(
					and(
						eq(users_games.gameId, input.gameId),
						eq(users_games.userId, ctx.session?.user.id!)
					)
				);
			await db
				.update(users)
				.set({
					medPoints: sql`${users.medPoints} + ${input.record.stats.totalMedpoints}`,
					questionsCorrect: sql`${users.questionsCorrect} + ${input.record.stats.correctAnswersCount}`,
					questionsTotal: sql`${users.questionsTotal} + ${input.record.stats.wrongAnswersCount} + ${input.record.stats.correctAnswersCount}`,
					eliminationsCorrect: sql`${users.eliminationsCorrect} + ${input.record.stats.correctEliminationsCount}`,
					eliminationsTotal: sql`${users.eliminationsTotal} + ${input.record.stats.wrongEliminationsCount} + ${input.record.stats.correctEliminationsCount}`,
					gamesTotal: sql`${users.gamesTotal} + 1`,
				})
				.where(eq(users.id, ctx.session?.user.id!));
		}),
});
