import { createTRPCNuxtClient, httpBatchLink } from "trpc-nuxt/client";
import type { AppRouter } from "~/server/trpc/routers";

export default defineNuxtPlugin(() => {
	const trpc = createTRPCNuxtClient<AppRouter>({
		links: [httpBatchLink({ url: "/api/v1" })],
	});

	return {
		provide: {
			trpc,
		},
	};
});
