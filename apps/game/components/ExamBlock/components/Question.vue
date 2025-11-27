<script setup lang="ts">
import ImagesGallery from "./ImagesGallery.vue";

defineProps<{
  imgUrls?: string[];
  body: string;
  textSize?: string;
  type?: "Default" | "Tabular";
  header?: string | null;
}>();
</script>

<template>
  <div class="w-full relative rounded-md p-5">
    <div class="overflow-hidden flex flex-col gap-3">
      <div class="flex items-start gap-2">
        <p class="leading-8 hyphens-auto flex-grow text-[0.9rem]">
          {{ body }}
        </p>
        <ImagesGallery
          v-if="imgUrls && imgUrls.length"
          :img-urls="imgUrls"
          class="shrink-0"
        />
      </div>
    </div>
  </div>
</template>
