/**
 * One-off cleanup: replace legacy hardcoded default avatar URLs with NULL so
 * the app falls back to the gender-based default.
 */
import { db, eq } from "../src";

const { users } = db.table;

const LEGACY_URL = "https://i.ibb.co/j5jqhRm/default-avatar-1.webp";

const result = await db
  .update(users)
  .set({ avatarUrl: null })
  .where(eq(users.avatarUrl, LEGACY_URL))
  .returning({ id: users.id });

console.log(`Reset ${result.length} legacy avatar URLs to NULL.`);
process.exit(0);
