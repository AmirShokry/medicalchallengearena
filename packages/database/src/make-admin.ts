import { db, eq } from "./index";

// Get command line arguments
// When running with npm: npm run dev2 --user=amir
// When running directly: node make-admin.js --user=amir
const args = process.argv.slice(2);

// Parse arguments - support npm config format and direct arguments
let userArg: string | undefined;

// First check npm config (when running npm run script --user=value)
if (process.env.npm_config_user) {
	userArg = process.env.npm_config_user;
} else {
	// Check for --user=value format in direct arguments
	const userEqualArg = args.find((arg) => arg.startsWith("--user="));
	if (userEqualArg) {
		userArg = userEqualArg.split("=")[1];
	} else {
		// Check for --user value format
		const userFlagIndex = args.indexOf("--user");
		if (userFlagIndex !== -1 && args[userFlagIndex + 1]) {
			userArg = args[userFlagIndex + 1];
		} else {
			// Fallback to first positional argument
			userArg = args[0];
		}
	}
}

console.log("All arguments:", args);
console.log("NPM config user:", process.env.npm_config_user);
console.log("Username argument:", userArg);

if (!userArg || userArg.startsWith("--")) {
	console.error("Usage: npm run dev2 --user=<username>");
	console.error("   Or: node make-admin.js --user=<username>");
	console.error("Example: npm run dev2 --user=amir");
	process.exit(1);
}

async function makeAdmin() {
	console.log(`Attempting to make user '${userArg}' an admin...`);

	const [user] = await db
		.select({
			id: db.table.users.id,
		})
		.from(db.table.users)
		.innerJoin(
			db.table.users_auth,
			eq(db.table.users_auth.user_id, db.table.users.id)
		)
		.where(eq(db.table.users.username, userArg!)); // userArg is guaranteed to be defined here

	if (!user) {
		console.error(`User '${userArg}' not found`);
		return;
	}

	await db
		.update(db.table.users_auth)
		.set({ role: "admin" })
		.where(eq(db.table.users_auth.user_id, user.id));

	console.log(`Successfully made user '${userArg}' an admin`);
	process.exit(0);
}

await makeAdmin();
