// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  devtools: { enabled: true },
  experimental: {
    typedPages: true,
  },
  runtimeConfig: {
    authSecret: process.env.NUXT_AUTH_SECRET,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD,
    // MCP connector (server-only). Endpoint: POST /mcp/<MCP_SECRET>
    mcpSecret: process.env.MCP_SECRET,
    // Optional: comma-separated Host allowlist (DNS-rebinding hardening).
    mcpAllowedHosts: process.env.MCP_ALLOWED_HOSTS,
    public: {
      imageApiKey: process.env.IMAGE_API_KEY || "No API Key Found",
    },
  },
  auth: {
    originEnvKey: "NUXT_AUTH_ORIGIN",
  },
  ssr: false,
  modules: [
    "shadcn-nuxt",
    "nuxt-svgo",
    "@pinia/nuxt",
    "@formkit/auto-animate/nuxt",
    "@sidebase/nuxt-auth",
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
    server: {
      allowedHosts: true,
    },
    plugins: [tailwindcss()],

    cacheDir: "../../node_modules/.vite/dashboard",
  },
});
