<script setup lang="ts">
defineProps<{
	questionIndex: number;
}>();
const { data } = useInputStore();
</script>
<template>
	<div aria-role="explanation-input" class="min-h-30">
		<div class="flex items-center justify-between h-8">
			<Label for="Explanation">Explanation</Label>
		</div>
		<ImageUploadProvider
			:images="data.questions[questionIndex].explanationImgUrls">
			<div class="min-h-22 flex items-center gap-1">
				<Textarea
					required
					form="submit-input"
					:name="`explanation-${questionIndex}`"
					class="min-h-22 break-all"
					tabindex="1"
					v-model="data.questions[questionIndex].explanation" />
				<ImageUploadTrigger />
			</div>
			<ImageUploadGallery class="py-2" />
		</ImageUploadProvider>
	</div>
</template>
