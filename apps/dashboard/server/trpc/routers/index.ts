import { createTRPCRouter } from "~/server/trpc/init";
import { systems } from "./systems";
import { block } from "./block";
import { common } from "./common";
import { auth } from "./auth";
import { usersRouter } from "./users";

export const appRouter = createTRPCRouter({
  systems,
  block,
  auth,
  common,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
