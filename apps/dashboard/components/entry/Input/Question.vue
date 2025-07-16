<script setup lang="ts">
const { questionIndex } = defineProps<{
	questionIndex: number;
}>();
const { data } = useInputStore();
const question = computed(() => data.questions[questionIndex]);
</script>
<template>
	<div aria-role="question-input" class="min-h-30">
		<div class="flex items-center justify-between h-10 mb-2">
			<Label for="question">
				Question
				<span class="underline underline-offset-1 unselectable"
					>#{{ questionIndex + 1 }}</span
				>
			</Label>
			<slot name="toolbar" />
		</div>
		<ImageUploadProvider :images="question.imgUrls">
			<div class="min-h-20 flex items-center gap-1">
				<Textarea
					required
					form="submit-input"
					:name="`question-${questionIndex}`"
					tabindex="1"
					class="min-h-20 break-all"
					v-model="question.body" />
				<ImageUploadTrigger />
			</div>
			<ImageUploadGallery />
		</ImageUploadProvider>
	</div>
</template>
