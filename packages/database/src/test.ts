import { db } from "./index";

console.dir(await db.select().from(db.table.users), { depth: 10 });
