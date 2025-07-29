import { createTRPCRouter } from "~/server/trpc/init";
import { systems } from "./systems";
import { block } from "./block";
import { common } from "./common";
import { auth } from "./auth";
export const appRouter = createTRPCRouter({
  systems,
  block,
  auth,
  common,
});

export type AppRouter = typeof appRouter;
