<script setup lang="ts">
import { ImageUpIcon } from "lucide-vue-next";
import { ref } from "vue";
// import type { Image } from ".";
import { isDraggingKey, imagesKey, maxSizeKBKey, apiKey } from "./keys";

const [isDragging, images, maxSizeKB, imageApiKey] = injectStrict([
	isDraggingKey,
	imagesKey,
	maxSizeKBKey,
	apiKey,
]);

const fileInput = ref<HTMLInputElement | null>(null);

function handleDrop(event: DragEvent) {
	const files = Array.from(event.dataTransfer?.files ?? []);
	handleFiles(files);
}
function onFilesSelected(event: Event) {
	const target = event.target as HTMLInputElement;
	const files = Array.from(target.files ?? []);
	handleFiles(files);
	if (fileInput.value) fileInput.value.value = "";
}

function handleFiles(fileList: FileList | File[]) {
	// const existingNames = new Set(images.value.map((img) => img.name));
	const loadPromises: Promise<string | null>[] = [];

	for (const file of fileList) {
		if (!file.type.startsWith("image/")) continue;
		const fileSizeKB = file.size / 1024;
		if (fileSizeKB > maxSizeKB.value) {
			console.error(
				`File "${file.name}" is too large. Max allowed is ${maxSizeKB.value}KB.`
			);
			continue;
		}

		// if (existingNames.has(file.name)) {
		// 	console.error(`File name "${file.name}" already exists.`);
		// 	continue;
		// }

		const url = URL.createObjectURL(file);

		const promise = new Promise<string | null>((resolve) => {
			const img = new window.Image();
			img.onload = async () => {
				const form = new FormData();
				form.append("api_key", imageApiKey.value);
				form.append("file", file);

				const response = await fetch(
					"https://api.imghippo.com/v1/upload",
					{
						method: "POST",
						body: form,
					}
				);
				const data = await response.json();
				const result = data.data;
				console.log(result);

				resolve(result.url);
			};
			img.onerror = () => {
				console.error(`Failed to load image "${file.name}".`);
				resolve(null);
			};
			img.src = url;
		});

		loadPromises.push(promise);
	}

	Promise.all(loadPromises).then((results) => {
		for (const img of results) if (img) images.value.push(img);
	});
}
</script>

<template>
	<div class="flex gap-2">
		<div
			class="w-10 h-10 inline-flex items-center justify-center max-w-2xl p-6 rounded-xl border border-border bg-muted/10 backdrop-blur-md shadow-md transition"
			@dragover.prevent
			@dragenter.prevent="isDragging = true"
			@dragleave.prevent="isDragging = false"
			@drop.prevent="handleDrop"
			:class="{ 'bg-purple-400/10': isDragging }">
			<div
				class="w-9 h-9 p-2 border-border border-2 border-dashed rounded-md flex flex-col items-center justify-center space-y-4 hover:bg-accent/50 transition cursor-pointer"
				@click="fileInput?.click()">
				<ImageUpIcon :size="25" />
			</div>

			<input
				ref="fileInput"
				type="file"
				accept="image/*"
				multiple
				class="hidden"
				@change="onFilesSelected" />
		</div>
	</div>
</template>
