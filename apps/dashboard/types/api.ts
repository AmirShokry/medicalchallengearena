import { TRPCClientError } from "@trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/routers";

export type APIOutput = inferRouterOutputs<AppRouter>;
export type ClientError = TRPCClientError<AppRouter>;
