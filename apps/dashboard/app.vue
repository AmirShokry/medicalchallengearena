<script setup lang="ts">
import { useColorMode } from '@vueuse/core';
useColorMode({
  initialValue: 'auto',
  storageKey: 'color-mode',
});
</script>

<template>
  <NuxtPage />
</template>
