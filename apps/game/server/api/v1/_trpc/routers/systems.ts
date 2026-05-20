import z from "zod";
import { createTRPCRouter, authProcedure } from "../init";
import { db, eq, or, sql, and, count } from "@package/database";
import { jsonAggBuildObject } from "@package/database/helpers";
import { caseTypeSchema, type CaseType } from "../shared";
export const systems = createTRPCRouter({
	self: authProcedure.query(
		async () => await db.select().from(db.table.systems)
	),
	matchingSystemCategories: authProcedure
		.input(
			z.object({
				user1Id: z.number().min(1),
				user2Id: z.number().min(1),
				caseType: caseTypeSchema.default("STEP 1"),
			})
		)
		.query(async ({ input }) => {
			const { categories, cases, users_cases, systems } = db.table;
			const CategoryStats = db.$with("CategoryStats").as(
				db
					.select({
						categoryId: categories.id,
						systemId: categories.system_id,
						categoryName: categories.name,
						totalCases:
							sql<number>`COUNT(DISTINCT ${cases.id})::int`.as(
								"totalCases"
							),
						user1UsedCases:
							sql<number>`COUNT(DISTINCT CASE WHEN users_cases.user_id = ${input.user1Id} THEN ${users_cases.case_id} END)::int`.as(
								"user1UsedCases"
							),
						user2UsedCases:
							sql<number>`COUNT(DISTINCT CASE WHEN users_cases.user_id = ${input.user2Id} THEN ${users_cases.case_id} END)::int`.as(
								"user2UsedCases"
							),
					})
					.from(categories)
					.leftJoin(
						cases,
						and(
							eq(cases.category_id, categories.id),
							eq(cases.type, input.caseType)
						)
					)
					.leftJoin(
						users_cases,
						and(
							eq(cases.id, users_cases.case_id),
							or(
								eq(users_cases.user_id, input.user1Id),
								eq(users_cases.user_id, input.user2Id)
							)
						)
					)
					.groupBy(categories.id)
			);

			return await db
				.with(CategoryStats)
				.select({
					id: systems.id,
					name: systems.name,
					allCount:
						sql<number>`COUNT(DISTINCT ${CategoryStats.categoryId})::int`.as(
							"allCount"
						),

					unusedCount1: sql<number>`SUM(CASE WHEN (${CategoryStats.totalCases} - ${CategoryStats.user1UsedCases}) > 0 THEN 1 ELSE 0 END)::int`,
					unusedCount2: sql<number>`SUM(CASE WHEN (${CategoryStats.totalCases} - ${CategoryStats.user2UsedCases}) > 0 THEN 1 ELSE 0 END)::int`,

					matchCount: sql<number>`
                SUM(
                    CASE WHEN 
                        (${CategoryStats.totalCases} - ${CategoryStats.user1UsedCases}) > 0 
                        AND 
                        (${CategoryStats.totalCases} - ${CategoryStats.user2UsedCases}) > 0 
                    THEN 1 ELSE 0 END
                )::int
            `,
					categories: jsonAggBuildObject({
						id: CategoryStats.categoryId,
						name: CategoryStats.categoryName,
						allCount: CategoryStats.totalCases,
						unusedCount1: sql<number>`(${CategoryStats.totalCases} - ${CategoryStats.user1UsedCases})::int`,
						unusedCount2: sql<number>`(${CategoryStats.totalCases} - ${CategoryStats.user2UsedCases})::int`,
						// A case is unused if neither user has used it
						matchCount: sql<number>`
                    (${CategoryStats.totalCases} -
                        (
                            SELECT COUNT(DISTINCT uc.case_id)
                            FROM users_cases uc
                            WHERE uc.case_id IN (
                                SELECT c.id
                                FROM cases c
                                WHERE c.category_id = ${CategoryStats.categoryId}
                                AND c.type = ${input.caseType}::case_type
                            )
                            AND uc.user_id IN (${input.user1Id}, ${input.user2Id})
                        )
                    )::int
                `,
					}),
				})
				.from(systems)
				.innerJoin(
					CategoryStats,
					eq(systems.id, CategoryStats.systemId)
				)
				.groupBy(systems.id);
		}),

	categories: authProcedure
		.input(
			z
				.object({ caseType: caseTypeSchema.default("STEP 1") })
				.default({ caseType: "STEP 1" })
		)
		.query(async ({ ctx, input }) => {
			const { cases, users_cases } = db.table;
			const [{ allCount }] = await db
				.select({ allCount: count() })
				.from(cases)
				.where(eq(cases.type, input.caseType));

			const [{ usedCount }] = await db
				.select({ usedCount: count() })
				.from(users_cases)
				.innerJoin(cases, eq(cases.id, users_cases.case_id))
				.where(
					and(
						eq(users_cases.user_id, ctx.session?.user.id!),
						eq(cases.type, input.caseType)
					)
				);
			const unusedCount = allCount - usedCount;

			const systemsCategories = await getSystemsCategoriesByUserId(
				ctx.session?.user.id!,
				input.caseType
			);

			return { systemsCategories, allCount, usedCount, unusedCount };
		}),
});
export async function getSystemsCategoriesByUserId(
	userId: number,
	caseType: CaseType = "STEP 1"
) {
	// Single CTE to get all the necessary counts in one pass
	const { systems, categories, cases, users_cases } = db.table;
	const CategoryStats = db.$with("CategoryStats").as(
		db
			.select({
				categoryId: categories.id,
				systemId: categories.system_id,
				categoryName: categories.name,
				totalCases: sql<number>`COUNT(DISTINCT ${cases.id})::int`.as(
					"totalCases"
				),
				usedCases:
					sql<number>`COUNT(DISTINCT ${users_cases.case_id})::int`.as(
						"usedCases"
					),
			})
			.from(categories)
			.leftJoin(
				cases,
				and(
					eq(cases.category_id, categories.id),
					eq(cases.type, caseType)
				)
			)
			.leftJoin(
				users_cases,
				and(
					eq(cases.id, users_cases.case_id),
					eq(users_cases.user_id, userId)
				)
			)
			.groupBy(categories.id)
	);
	return await db
		.with(CategoryStats)
		.select({
			id: systems.id,
			name: systems.name,
			allCount:
				sql<number>`COUNT(DISTINCT ${CategoryStats.categoryId})::int`.as(
					"allCount"
				),
			unusedCount: sql<number>`SUM(CASE WHEN (${CategoryStats.totalCases} - ${CategoryStats.usedCases}) > 0 THEN 1 ELSE 0 END)::int`,
			categories: jsonAggBuildObject({
				id: CategoryStats.categoryId,
				name: CategoryStats.categoryName,
				allCount: CategoryStats.totalCases,
				unusedCount: sql<number>`(${CategoryStats.totalCases} - ${CategoryStats.usedCases})::int`,
			}),
		})
		.from(systems)
		.innerJoin(CategoryStats, eq(systems.id, CategoryStats.systemId))
		.groupBy(systems.id);
}
