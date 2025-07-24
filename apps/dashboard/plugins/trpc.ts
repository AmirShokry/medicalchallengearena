import { createTRPCNuxtClient, httpBatchLink } from "trpc-nuxt/client";
import type { AppRouter } from "~/server/trpc/routers";
import superjson from "superjson";

export default defineNuxtPlugin(() => {
	const trpc = createTRPCNuxtClient<AppRouter>({
		links: [
			httpBatchLink({
				transformer: superjson,
				url: "/api/v1",
				fetch(url, options) {
					return fetch(url, {
						...options,
						credentials: "include", // <- important
					});
				},
			}),
		],
	});

	return {
		provide: {
			trpc,
		},
	};
});
