<script setup lang="ts">
defineProps<{
	tabindex?: number;
}>();
const caseData = defineModel<{
	id: number;
	body: string;
	imgUrls: string[];
}>("case", { required: true });
</script>

<template>
	<div aria-role="case-input">
		<ImageUploadProvider :images="caseData.imgUrls">
			<div class="grid gap-2">
				<Label for="case">Case</Label>
				<div class="flex items-center gap-1">
					<Textarea
						v-model="caseData.body"
						class="break-all"
						name="case"
						:tabindex="tabindex" />
					<ImageUploadTrigger />
				</div>
				<ImageUploadGallery />
			</div>
		</ImageUploadProvider>
	</div>
</template>
