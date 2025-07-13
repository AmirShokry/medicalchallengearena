<script setup lang="ts">
defineProps<{
	tabindex?: number;
}>();
const explanation = defineModel<string>("explanation", { required: true });
const explanationImgUrls = defineModel<string[]>("explanationImgUrls", {
	required: true,
});
</script>
<template>
	<div aria-role="explanation-input">
		<ImageUploadProvider :images="explanationImgUrls">
			<div class="grid gap-2">
				<Label for="Explanation">Explanation</Label>
				<div class="flex items-center gap-1">
					<Textarea
						class="break-all"
						v-model="explanation"
						name="question"
						:tabindex="tabindex" />
					<ImageUploadTrigger />
				</div>
				<ImageUploadGallery />
			</div>
		</ImageUploadProvider>
	</div>
</template>
