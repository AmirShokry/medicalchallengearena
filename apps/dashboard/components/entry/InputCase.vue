<script setup lang="ts">
import type { Image } from "@/components/ui/image-upload";

defineProps<{
	tabindex?: number;
}>();
const images = ref<Image[]>([]);
</script>

<template>
	<div aria-role="case-input">
		<ImageUploadProvider :images="images">
			<div class="grid gap-2">
				<Label for="case">Case</Label>
				<div class="flex items-center gap-1">
					<Textarea class='break-all' name="case" :tabindex="tabindex" />
					<ImageUploadTrigger />
				</div>
				<ImageUploadGallery />
			</div>
		</ImageUploadProvider>
	</div>
</template>
