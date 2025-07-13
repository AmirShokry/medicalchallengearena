import { createTRPCRouter } from "~/server/trpc/init";
import { systems } from "./systems";
import { keys } from "./keys";
import { block } from "./block";
import { common } from "./common";
export const appRouter = createTRPCRouter({
	systems,
	keys,
	block,
	common,
});

export type AppRouter = typeof appRouter;
