<script setup lang="ts">
// import Gallery from "@client/components/ui/Gallery.vue";
defineProps<{
	imgUrls?: string[];
	body: string;
	textSize?: string;
}>();
</script>

<template>
	<div class="w-full relative rounded-md p-5">
		<div class="overflow-hidden flex">
			<p class="leading-8 hyphens-auto flex-grow text-[0.9rem]">
				{{ body }}
			</p>
			<!-- <Gallery class="one-column ml-2" :list="imgUrls!" /> -->
		</div>
	</div>
</template>
