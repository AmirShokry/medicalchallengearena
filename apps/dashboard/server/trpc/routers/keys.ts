import { createTRPCRouter, authProcedure } from "../init";

export const keys = createTRPCRouter({
	imageApi: authProcedure.query(async () => {
		return process.env.IMAGE_API_KEY || "No API Key Found";
	}),
});
