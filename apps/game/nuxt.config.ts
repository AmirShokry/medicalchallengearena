// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2025-05-15",
	devtools: { enabled: false },
	runtimeConfig: {
		authSecret: process.env.NUXT_AUTH_SECRET,
	},
	auth: {
		originEnvKey: "NUXT_AUTH_ORIGIN",
	},
	modules: [
		"@nuxt/eslint",
		"nuxt-svgo",
		"shadcn-nuxt",
		"@sidebase/nuxt-auth",
		"@pinia/nuxt",
	],
	build: {
		transpile: ["trpc-nuxt"],
	},
	experimental: {
		typedPages: true,
	},
	nitro: {
		experimental: {
			websocket: true,
		},
	},
	vite: {
		plugins: [tailwindcss()],
		server: {
			allowedHosts: true,
		},
	},
	css: ["~/assets/css/tailwind.css"],
	ssr: false,
	telemetry: {
		enabled: false,
	},
});
