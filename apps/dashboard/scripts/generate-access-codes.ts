import { db, accessCodes } from "@package/database";

async function main() {
  console.log("Generating 10 access codes...");
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push({ used: false });
  }

  const result = await db.insert(accessCodes).values(codes).returning();
  console.log("Generated codes:");
  result.forEach((r) => console.log(r.code));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
