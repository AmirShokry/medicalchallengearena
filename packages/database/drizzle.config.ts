/**
 * @fileoverview Database parameters for drizzle-kit for generating migrations.
 */
import { defineConfig } from "drizzle-kit";
import "./load-env";
import { env } from "./env";
// import { fileURLToPath } from "node:url";
// import { resolve, relative } from "node:path";
// const relativePath = relative(
// 	process.cwd(),
// 	resolve(fileURLToPath(import.meta.url), "..")
// ).replace(/\\/g, "/"); // Retarded framework that only accept relative paths with forward slashes

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
