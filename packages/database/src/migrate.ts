import { db, sql } from "./index";
await db
	.update(db.table.cases_questions)
	.set({
		imgUrls: [],
	})
	.where(sql`${db.table.cases_questions.imgUrls} IS NULL`);

console.log("✅ All NULL values updated");
process.exit(0);
