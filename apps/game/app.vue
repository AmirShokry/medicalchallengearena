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
  <NuxtLayout>
    <ClientOnly>
      <Toaster />
      <Connection v-if="status !== 'loading'" />
      <Peer />
    </ClientOnly>
    <NuxtPage />
  </NuxtLayout>
</template>
