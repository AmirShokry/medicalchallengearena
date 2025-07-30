import z from "zod";
import { createTRPCRouter, authProcedure } from "../init";
import { db, sql } from "@package/database";
export const cases = createTRPCRouter({
	mactchingCount: authProcedure
		.input(
			z.object({
				user1Id: z.number().min(1),
				user2Id: z.number().min(1),
			})
		)
		.query(async ({ input }) => {
			const { cases, users_cases } = db.table;
			const UserStatsCTE = db.$with("UserStats").as(
				db
					.select({
						user1_count:
							sql<number>`COUNT(DISTINCT CASE WHEN user_id = ${input.user1Id} THEN case_id END)::int`.as(
								"user1_count"
							),
						user2_count:
							sql<number>`COUNT(DISTINCT CASE WHEN user_id = ${input.user2Id} THEN case_id END)::int`.as(
								"user2_count"
							),
						matching_count: sql<number>`
				(SELECT COUNT(DISTINCT ${cases.id})
				FROM ${cases} WHERE ${cases.id} NOT IN (
					SELECT ${users_cases.case_id}
					FROM ${users_cases} 
					WHERE ${users_cases.user_id} = ${input.user1Id} OR ${users_cases.user_id} = ${input.user2Id}
					)
				)::int
				`.as("matching_count"),
						total_count:
							sql<number>`(SELECT COUNT(DISTINCT id)::int FROM ${cases})`.as(
								"total_count"
							),
					})
					.from(users_cases)
			);

			return await db
				.with(UserStatsCTE)
				.select({
					matchingCount: sql<number>`${UserStatsCTE.matching_count}`,
					allCount: sql<number>`${UserStatsCTE.total_count}`,
					unusedCount1: sql<number>`${UserStatsCTE.total_count} - ${UserStatsCTE.user1_count}`,
					unusedCount2: sql<number>`${UserStatsCTE.total_count} - ${UserStatsCTE.user2_count}`,
				})
				.from(UserStatsCTE);
		}),
});
