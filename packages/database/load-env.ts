import { resolve, join } from "path";
import dotenv from "dotenv";
const EXTRACT_PATH_REGEX = /@?(?<path>[^\(\n]+?):\d+:\d+/;
function getPathFromErrorStack() {
	let path = "";
	const stack = new Error().stack;
	if (!stack) {
		console.warn("Error has no stack!");
		return path;
	}

	let initiator = stack.split("\n")?.at(1);
	if (initiator)
		path = EXTRACT_PATH_REGEX.exec(initiator)?.groups?.path || "";

	if (!initiator || !path) console.warn("Can't get path from error stack!");

	return path;
}
const envDir = join(resolve(getPathFromErrorStack(), ".."), ".env");
dotenv.config({ path: envDir });

const noop = () => {};
export default noop;
