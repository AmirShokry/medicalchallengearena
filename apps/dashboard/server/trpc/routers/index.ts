import { createTRPCRouter } from "~/server/trpc/init";
import { systems } from "./systems";
// import { z } from "zod";

export const appRouter = createTRPCRouter({
	systems,
});

// export type definition of API
export type AppRouter = typeof appRouter;
