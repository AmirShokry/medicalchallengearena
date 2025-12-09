<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import { Toaster } from "@/components/ui/sonner";
import "vue-sonner/style.css";

useColorMode({
  initialValue: "auto",
});

const { status } = useAuth();
</script>
<template>
  <ClientOnly>
    <Toaster />
    <Connection v-if="status !== 'unauthenticated'" />
    <!-- Social component handles friend status and messaging via Socket.IO -->
    <Social v-if="status !== 'unauthenticated'" />
  </ClientOnly>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
