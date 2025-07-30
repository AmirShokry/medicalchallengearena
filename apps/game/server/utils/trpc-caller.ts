import type { H3Event } from "h3";
import { appRouter } from "@/server/api/v1/_trpc/routers";
import { createTRPCContext } from "@/server/api/v1/_trpc/init";

export async function getTRPCCaller(event: H3Event) {
  const ctx = await createTRPCContext(event); // You can inject req/res here if needed
  return appRouter.createCaller(ctx);
}
