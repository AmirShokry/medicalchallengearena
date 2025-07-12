import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { and, db, eq, getTableColumns } from "database";
// import { getTableColumnsExcept } from "database/helpers";
import { CasesQuestionsChoicesCTE } from "database/ctes";
import { TRPCError } from "@trpc/server";
export const block = createTRPCRouter({
	get: baseProcedure
		.input(
			z.object({
				system: z.string(),
				category: z.string(),
			})
		)
		.query(async ({ input }) => {
			const result = await db
				.selectDistinct()
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
				.limit(1);

			// console.log(result);

			if (!result.length)
				throw new TRPCError({
					message:
						"System or category not found, or they are not related",
					code: "NOT_FOUND",
				});

			return await db
				.with(CasesQuestionsChoicesCTE)
				.select()
				.from(CasesQuestionsChoicesCTE)
				.where(
					eq(
						CasesQuestionsChoicesCTE.category_id,
						result[0].categories.id
					)
				);

			// return result[0];
		}),
});
