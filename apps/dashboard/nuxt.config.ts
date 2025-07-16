// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	devtools: { enabled: true },
	experimental: {
		typedPages: true,
	},
	ssr: false,
	modules: [
		"shadcn-nuxt",
		"nuxt-svgo",
		"@pinia/nuxt",
		"@formkit/auto-animate/nuxt",
	],
	telemetry: false,
	shadcn: {
		prefix: "",
		componentDir: "./components/ui",
	},
	build: {
		transpile: ["trpc-nuxt"],
	},
	svgo: {
		dts: true,
	},
	css: ["~/assets/css/tailwind.css"],
	vite: {
		plugins: [tailwindcss()],

		cacheDir: "../../node_modules/.vite/dashboard",
	},
});
