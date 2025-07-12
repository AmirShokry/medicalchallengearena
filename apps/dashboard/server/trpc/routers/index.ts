import { createTRPCRouter } from "~/server/trpc/init";
import { systems } from "./systems";
import { keys } from "./keys";
import { block } from "./block";
export const appRouter = createTRPCRouter({
	systems,
	keys,
	block,
});

export type AppRouter = typeof appRouter;
