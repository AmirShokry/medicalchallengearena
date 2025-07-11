import { createTRPCRouter } from "~/server/trpc/init";
import { systems } from "./systems";
import { keys } from "./keys";
export const appRouter = createTRPCRouter({
	systems,
	keys,
});

export type AppRouter = typeof appRouter;
