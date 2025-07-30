import { createTRPCNuxtHandler } from "trpc-nuxt/server";
import { createTRPCContext } from "./_trpc/init";
import { appRouter } from "./_trpc/routers";

export default createTRPCNuxtHandler({
	endpoint: "/api/v1",
	router: appRouter,
	createContext: createTRPCContext,
});
