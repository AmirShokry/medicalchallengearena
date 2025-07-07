// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	devtools: { enabled: true },
	ssr: false,
	modules: ["shadcn-nuxt"],
	telemetry: false,
	shadcn: {
		prefix: "",
		componentDir: "./components/ui",
	},
	css: ["~/assets/css/tailwind.css"],
	vite: {
		plugins: [tailwindcss()],

		cacheDir: "../../node_modules/.vite/dashboard",
	},
});
