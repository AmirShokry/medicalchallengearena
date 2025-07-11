<script setup lang="ts">
import type {Image} from "@/components/ui/image-upload/index.ts"
defineProps<{
	tabindex?: number;
	index: number;
}>();
const question = defineModel<{
	id: number;
	body: string;
	imgUrls?: string[];
	isStudyMode?: boolean;
}>('question', {required: true});
const images = ref<Image[]>([])
</script>
<template>
	<div aria-role='question-input'>
		<ImageUploadProvider :images='images'>
			<div class='grid gap-2'>

				<Label for='question'><span class='underline underline-offset-1'>#{{ index+1 }}</span> Question</Label>
				<div class='flex items-center gap-1'>
					<Textarea class='break-all' v-model='question.body' name='question' :tabindex="tabindex" />
					<ImageUploadTrigger />
				</div>
				<ImageUploadGallery />
			</div>
		</ImageUploadProvider>
	</div>
</template>