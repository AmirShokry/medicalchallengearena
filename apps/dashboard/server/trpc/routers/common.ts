import { TRPCError } from "@trpc/server";
import { authProcedure, createTRPCRouter } from "../init";
import { and, db, eq } from "@package/database";

import z from "zod";
export const common = createTRPCRouter({
	isValidSystemCategory: authProcedure
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
			if (result.length <= 0) return false;
			return true;
		}),

	getCategoryIdByName: authProcedure
		.input(
			z.object({
				category: z.string(),
			})
		)
		.query(async ({ input }) => {
			const result = await db
				.selectDistinct({ id: db.table.categories.id })
				.from(db.table.categories)
				.where(eq(db.table.categories.name, input.category))
				.limit(1);
			if (result.length <= 0)
				throw new TRPCError({
					message: "System or category not found",
					code: "NOT_FOUND",
				});
			return result[0].id;
		}),
});
