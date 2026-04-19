// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  // compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  runtimeConfig: {
    authSecret: process.env.NUXT_AUTH_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET_KEY: process.env.STRIPE_WEBHOOK_SECRET_KEY,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD,
    OCI_TENANCY_OCID: process.env.OCI_TENANCY_OCID,
    OCI_USER_OCID: process.env.OCI_USER_OCID,
    OCI_FINGERPRINT: process.env.OCI_FINGERPRINT,
    OCI_PRIVATE_KEY: process.env.OCI_PRIVATE_KEY,
    OCI_PRIVATE_KEY_PASSPHRASE: process.env.OCI_PRIVATE_KEY_PASSPHRASE,
    OCI_REGION: process.env.OCI_REGION,
    OCI_NAMESPACE: process.env.OCI_NAMESPACE,
    OCI_BUCKET_NAME: process.env.OCI_BUCKET_NAME || "bucket-20260308-1833",
    public: {
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
      NUXT_BASE_URL: process.env.NUXT_BASE_URL || "https://medicalchallengearena.com",
    },
  },
  auth: {
    originEnvKey: "NUXT_AUTH_ORIGIN",
    sessionRefresh: {
      enabledPeriodically: true,
      enabledOnWindowFocus: true,
    },
  },
  modules: ["nuxt-svgo", "shadcn-nuxt", "@sidebase/nuxt-auth", "@pinia/nuxt"],
  build: {
    transpile: ["trpc-nuxt", "gsap"],
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
