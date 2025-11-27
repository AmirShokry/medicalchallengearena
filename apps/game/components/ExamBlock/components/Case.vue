<script setup lang="ts">
import ImagesGallery from "./ImagesGallery.vue";

defineProps<{
  imgUrls?: string[];
  tooltipClass?: string;
}>();
</script>

<template>
  <div class="w-full relative rounded-md py-2 px-4">
    <div class="overflow-hidden flex items-start gap-2">
      <div class="flex-grow">
        <slot />
      </div>
      <ImagesGallery
        v-if="imgUrls && imgUrls.length"
        :img-urls="imgUrls"
        class="shrink-0"
      />
    </div>
  </div>
</template>
