<script setup lang="ts">
import type { Image } from ".";
import { imagesKey, isDraggingKey, maxSizeKBKey, ratioTextKey, apiKey } from "./keys";

const images = defineModel<Image[]>("images", { required: true });
const isDragging = ref(false);
const maxSizeKB = ref(1024);
const ratioText = ref("16:9");
const {$trpc} = useNuxtApp();
const imageApiKey  = ref(await $trpc.keys.imageApi.query());

provide(imagesKey, images);
provide(isDraggingKey, isDragging);
provide(maxSizeKBKey, maxSizeKB);
provide(ratioTextKey, ratioText);
provide(apiKey, imageApiKey);

</script>

<template>
	<slot />
</template>
