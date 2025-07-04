// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	devtools: { enabled: true },
	modules: ["shadcn-nuxt"],
	shadcn: {
		prefix: "",
		componentDir: "./components/ui",
	},
	vite: {
		cacheDir: "../../node_modules/.vite/dashboard",
	},
});
