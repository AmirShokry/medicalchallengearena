<script setup lang="ts">
// import Gallery from "@client/components/ui/Gallery.vue";
defineProps<{
	imgUrls?: string[];
	tooltipClass?: string;
}>();
</script>

<template>
	<div class="w-full relative rounded-md py-2 px-4">
		<div class="overflow-hidden flex">
			<slot />
			<!-- <Gallery class="one-column ml-2" :list="imgUrls!" /> -->
		</div>
	</div>
</template>
