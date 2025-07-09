import { createTRPCNuxtHandler } from "trpc-nuxt/server";
import { createTRPCContext } from "~/server/trpc/init";
import { appRouter } from "~/server/trpc/routers";

export default createTRPCNuxtHandler({
	endpoint: "/api/v1",
	router: appRouter,
	createContext: createTRPCContext,
});
