import { createTRPCRouter } from "~/server/api/v1/_trpc/init";
// import { z } from "zod";
import { block } from "./block";
import { auth } from "./auth";
import { common } from "./common";
import { systems } from "./systems";
import { cases } from "./cases";
import { exam } from "./exam";
import { friends } from "./friends";
import { reviews } from "./reviews";
export const appRouter = createTRPCRouter({
  block,
  auth,
  common,
  systems,
  cases,
  exam,
  friends,
  reviews,
});

// export type definition of API
export type AppRouter = typeof appRouter;
