<script setup lang="ts">
import { injectContext } from "./Root.vue";
defineProps<{
	questionIndex: number;
}>();
const context = injectContext();
</script>
<template>
	<div aria-role="explanation-input" class="min-h-30">
		<div class="flex items-center justify-between h-8">
			<Label for="Explanation">Explanation</Label>
		</div>
		<ImageUploadProvider
			:images="context.data.questions[questionIndex].explanationImgUrls">
			<div class="min-h-22 flex items-center gap-1">
				<Textarea
					class="min-h-22 break-all"
					tabindex="1"
					v-model="context.data.questions[questionIndex].explanation"
					name="question" />
				<ImageUploadTrigger />
			</div>
			<ImageUploadGallery class="py-2" />
		</ImageUploadProvider>
	</div>
</template>
