/**
 * @fileoverview Database parameters for drizzle-kit for generating migrations.
 */
import { defineConfig } from "drizzle-kit";
import { env } from "./env";

export default defineConfig({
	schema: `./src/schema.ts`,
	out: `./migrations`,
	dialect: "postgresql",
	dbCredentials: {
		host: env.DB_HOST,
		database: env.DB_NAME,
		port: env.DB_PORT,
		user: env.DB_USER,
		password: env.DB_PASSWORD,
	},
});
