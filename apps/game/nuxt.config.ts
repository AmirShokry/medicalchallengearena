// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  runtimeConfig: {
    authSecret: process.env.NUXT_AUTH_SECRET,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET_KEY: process.env.STRIPE_WEBHOOK_SECRET_KEY,
  },
  auth: {
    originEnvKey: "NUXT_AUTH_ORIGIN",
  },
  modules: ["nuxt-svgo", "shadcn-nuxt", "@sidebase/nuxt-auth", "@pinia/nuxt"],
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
