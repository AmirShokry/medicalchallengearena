import { authProcedure, createTRPCRouter } from "~/server/api/v1/_trpc/init";
import { z } from "zod";
import { getTableColumns, db, sql, eq, inArray, and } from "@package/database";

import {
	allBlockByCategoriesIdsSchema,
	allBlockByCategoriesIds,
	unusedBlockByCategoriesIdsSchema,
	unusedBlockByCategoriesIds,
} from "../shared";

export const block = createTRPCRouter({
	allBlockByCategoriesIds: authProcedure
		.input(allBlockByCategoriesIdsSchema)
		.query(async ({ input }) => await allBlockByCategoriesIds(input)),
	unusedBlockByCategoriesIds: authProcedure
		.input(unusedBlockByCategoriesIdsSchema)
		.query(async ({ input }) => await unusedBlockByCategoriesIds(input)),
});
