<script setup lang="ts">
import { injectContext } from "./Root.vue";
const context = injectContext();
</script>

<template>
	<div aria-role="case-input" class="min-h-30">
		<div class="flex items-center justify-between h-8">
			<Label for="case">Case</Label>
		</div>

		<ImageUploadProvider :images="context.data.imgUrls">
			<div class="min-h-22 flex items-center gap-1">
				<Textarea
					name="case"
					tabindex="1"
					v-model="context.data.body"
					class="min-h-22 break-all" />
				<ImageUploadTrigger />
			</div>
			<ImageUploadGallery class="py-2" />
		</ImageUploadProvider>
	</div>
</template>
