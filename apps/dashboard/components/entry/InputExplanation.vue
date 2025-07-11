<script setup lang="ts">
import type {Image} from "@/components/ui/image-upload/index.ts";
defineProps<{
	tabindex?: number;
}>();
const explanation = defineModel('explanation', {required: true, type: String});
const images = ref<Image[]>([]);
</script>
<template>
	<div aria-role='explanation-input'>
		<ImageUploadProvider :images='images'>
			<div class='grid gap-2'>
				<Label for='Explanation'>Explanation</Label>
				<div class='flex items-center gap-1'>
					<Textarea class='break-all' v-model='explanation' name='question' :tabindex="tabindex" />
					<ImageUploadTrigger />
				</div>
				<ImageUploadGallery />
			</div>
		</ImageUploadProvider>
	</div>
</template>