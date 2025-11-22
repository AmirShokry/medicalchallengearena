import { createTRPCNuxtClient, httpBatchLink } from "trpc-nuxt/client";
import type { AppRouter } from "@/server/api/v1/_trpc/routers";
import superjson from "superjson";

export default defineNuxtPlugin(() => {
  const trpc = createTRPCNuxtClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/api/v1",
        transformer: superjson,
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include", // <- important
          } as any);
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
