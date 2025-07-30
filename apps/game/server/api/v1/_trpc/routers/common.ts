import { publicProcedure, createTRPCRouter } from "../init";
import { UsersRanksCTE } from "@package/database/ctes";
import { db } from "@package/database";
import z, { set } from "zod";

export const common = createTRPCRouter({
	ranks: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(10),
			})
		)
		.query(async ({ input }) => {
			return await db
				.with(UsersRanksCTE)
				.select()
				.from(UsersRanksCTE)
				.limit(input.limit);
		}),
});
