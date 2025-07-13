import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { and, db, eq } from "database";
import { CasesQuestionsChoicesCTE } from "database/ctes";
import { TRPCError } from "@trpc/server";
export const block = createTRPCRouter({
	get: baseProcedure
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
									eq(
										db.table.systems.id,
										db.table.categories.system_id
									)
								)
								.where(
									and(
										eq(db.table.systems.name, input.system),
										eq(
											db.table.categories.name,
											input.category
										)
									)
								)
								.limit(1)
						),
						eq(CasesQuestionsChoicesCTE.type, input.caseType)
					)
				);

			if (!result.length)
				throw new TRPCError({
					message:
						"System or category not found, or they are not related",
					code: "NOT_FOUND",
				});

			return result;
		}),
});
