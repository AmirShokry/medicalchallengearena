import { db, eq, getTableColumns } from "@package/database";
import {
	getTableColumnsExcept,
	jsonAggBuildObject,
} from "@package/database/helpers";
import { createTRPCRouter, authProcedure } from "../init";

export const systems = createTRPCRouter({
	categories: authProcedure.query(
		async () =>
			await db
				.select({
					...getTableColumns(db.table.systems),
					categories: jsonAggBuildObject({
						...getTableColumnsExcept(db.table.categories, [
							"system_id",
						]),
					}),
				})
				.from(db.table.systems)
				.innerJoin(
					db.table.categories,
					eq(db.table.systems.id, db.table.categories.system_id)
				)
				.groupBy(db.table.systems.id)
				.orderBy(db.table.systems.id)
	),
});
