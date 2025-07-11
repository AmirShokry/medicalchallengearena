import { createTRPCRouter, baseProcedure } from "../init";

export const keys = createTRPCRouter({
	imageApi: baseProcedure.query(async () => {
		return process.env.IMAGE_API_KEY || "No API Key Found";
	}),
});
