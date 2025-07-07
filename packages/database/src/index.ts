/**
 * @fileoverview Connection initiation with drizzle-orm[postgres-js]
 */

import { PgTable } from "drizzle-orm/pg-core";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

import { env } from "../env";

const pg = postgres(
	`postgres://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`
);

const db = drizzle(pg, { schema }) as PostgresJsDatabase<typeof schema> & {
	$client: postgres.Sql<{}>;
} & {
	table: {
		[k in keyof typeof schema as (typeof schema)[k] extends PgTable
			? k
			: never]: (typeof schema)[k];
	};
	views: typeof schema.views;
};
db.table = db._.fullSchema;
db.views = schema.views;

export async function checkConnection() {
	console.log("Checking database connection");
	await pg`SELECT 1`.catch((err) => {
		console.error(err);
		process.exit(1);
	});
	console.log("✅ Database connection established successfully.");
	// console.clearLine();
	// console.log(
	// 	`Database@${process.env.POSTGRES_PORT}✅ [${__filenameFromCWD}]`
	// );
}

export { db };
export * from "drizzle-orm";
export * from "./helpers";

export * from "./schema";
