import { db, users, users_auth, eq } from "@package/database";

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Please provide a username.");
    process.exit(1);
  }

  console.log(`Making ${username} an admin...`);

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    console.error("User not found.");
    process.exit(1);
  }

  const auth = await db.query.users_auth.findFirst({
    where: eq(users_auth.user_id, user.id),
  });

  if (auth) {
    await db
      .update(users_auth)
      .set({ role: "admin" })
      .where(eq(users_auth.user_id, user.id));
  } else {
    console.error("User auth record not found.");
    process.exit(1);
  }

  console.log(`User ${username} is now an admin.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
