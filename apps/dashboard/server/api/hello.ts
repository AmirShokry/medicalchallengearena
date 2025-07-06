import { db } from "database";
export default defineEventHandler(async (context) => {
	const result = await db.select().from(db.table.users).limit(10);
	return {
		result,
	};
});
