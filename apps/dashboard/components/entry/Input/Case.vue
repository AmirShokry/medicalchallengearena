<script setup lang="ts">
const { data } = useInputStore();

// const error = ref(false);
// function isValidInput() {
// 	console.log("Validating Input");
// 	if (!data.body) return (error.value = true);
// 	error.value = false;
// }
</script>

<template>
	<div aria-role="case-input" class="min-h-30">
		<div class="flex items-center h-8">
			<Label for="case">Case</Label>
		</div>

		<ImageUploadProvider :images="data.imgUrls">
			<div class="min-h-22 flex items-center gap-1">
				<Textarea
					required
					form="submit-input"
					name="case"
					tabindex="1"
					v-model="data.body"
					class="min-h-22 break-all" />
				<ImageUploadTrigger />
			</div>
			<ImageUploadGallery class="py-2" />
		</ImageUploadProvider>
	</div>
</template>
