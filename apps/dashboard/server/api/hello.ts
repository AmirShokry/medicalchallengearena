import { db, eq, getTableColumns } from "database";
import { getTableColumnsExcept, jsonAggBuildObject } from "database/helpers";
export default defineEventHandler(async (context) => {
	const result = await db
		.select({
			...getTableColumns(db.table.systems),
			categories: jsonAggBuildObject({
				...getTableColumnsExcept(db.table.categories, ["system_id"]),
			}),
		})
		.from(db.table.systems)
		.innerJoin(
			db.table.categories,
			eq(db.table.systems.id, db.table.categories.system_id)
		)
		.groupBy(db.table.systems.id)
		.orderBy(db.table.systems.id);

	return result;
});
