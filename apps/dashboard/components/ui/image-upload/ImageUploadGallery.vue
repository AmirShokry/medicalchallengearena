<script setup lang="ts">
import { ExternalLinkIcon, EyeIcon, Trash2Icon } from "lucide-vue-next";
// import type { Image } from ".";
import { imagesKey, apiKey } from "./keys";

const props = withDefaults(
	defineProps<{
		canDelete?: boolean;
	}>(),
	{
		canDelete: true,
	}
);
const showModal = ref(false);

const [images, imageApiKey] = injectStrict([imagesKey, apiKey]),
	activeImageIndex = ref<number | null>(1),
	activeImage = computed<string>(() => {
		if (
			activeImageIndex.value !== null &&
			images.value[activeImageIndex.value]
		)
			return images.value[activeImageIndex.value];
		return "";
		// return {
		// 	name: "",
		// 	size: 0,
		// 	url: "",
		// };
	});

const zoom = ref(1),
	ZOOM_MIN = 0.1,
	ZOOM_MAX = 5,
	ZOOM_STEP = 0.2;

const drag = reactive({
	isDragging: false,
	start: { x: 0, y: 0 },
	offset: { x: 0, y: 0 },
});

function handleViewImage(index: number) {
	activeImageIndex.value = index;
	resetZoom();
	showModal.value = true;
}
async function removeImage(index: number) {
	if (!props.canDelete) return;
	const removedImgUrl = images.value.splice(index, 1)[0];
	console.log(removedImgUrl);

	const form = new URLSearchParams();
	form.append("api_key", imageApiKey.value);
	form.append("url", removedImgUrl);
	const response = await fetch("https://api.imghippo.com/v1/delete", {
		method: "DELETE",
		body: form,
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
	});
	console.log(await response.json());

	if (!removedImgUrl) return new Error("Invalid image data");
	if (index === activeImageIndex.value) handleCloseModal();
}

function handleCloseModal() {
	showModal.value = false;
	resetZoom();
}

function handlePrevImage() {
	if (images.value.length < 2 || activeImageIndex.value === null) return;
	activeImageIndex.value =
		(activeImageIndex.value - 1 + images.value.length) %
		images.value.length;
	resetZoom();
}

function handleNextImage() {
	if (images.value.length < 2 || activeImageIndex.value === null) return;
	activeImageIndex.value = (activeImageIndex.value + 1) % images.value.length;
	resetZoom();
}

const zoomedStyle = computed(() => ({
	transform: `scale(${zoom.value}) translate(${drag.offset.x}px, ${drag.offset.y}px)`,
	transition: drag.isDragging ? "none" : "transform 0.3s",
}));

function formatSize(bytes: number): string {
	if (bytes > 1048576) return (bytes / 1048576).toFixed(2) + " MB";
	if (bytes > 1024) return (bytes / 1024).toFixed(1) + " KB";
	return `${bytes} B`;
}

function zoomIn() {
	zoom.value = Math.min(zoom.value + ZOOM_STEP, ZOOM_MAX);
}

function zoomOut() {
	zoom.value = Math.max(zoom.value - ZOOM_STEP, ZOOM_MIN);
}

function resetZoom() {
	zoom.value = 1;
	drag.offset = { x: 0, y: 0 };
}

function startDrag(e: MouseEvent) {
	if (zoom.value <= 1) return;
	drag.isDragging = true;
	drag.start = { x: e.clientX, y: e.clientY };
}
// Handle dragging the image in the modal
function onDrag(e: MouseEvent) {
	if (!drag.isDragging) return;
	const dx = e.clientX - drag.start.x;
	const dy = e.clientY - drag.start.y;
	drag.offset.x += dx;
	drag.offset.y += dy;
	drag.start = { x: e.clientX, y: e.clientY };
}
// Stop dragging when zooming in
function endDrag() {
	drag.isDragging = false;
}
// Zoom with mouse wheel in modal
function onWheelZoom(e: WheelEvent) {
	e.preventDefault();
	if (e.deltaY < 0) zoomIn();
	else zoomOut();
}

// Handle keyboard navigation in modal
function handleKeyDown(e: KeyboardEvent) {
	if (!showModal.value) return;
	if (e.key === "Escape") handleCloseModal();
	else if (e.key === "ArrowLeft") handlePrevImage();
	else if (e.key === "ArrowRight") handleNextImage();
}

onMounted(() => window.addEventListener("keydown", handleKeyDown));

onBeforeUnmount(() => window.removeEventListener("keydown", handleKeyDown));
</script>
<template>
	<div v-if="images.length" class="flex">
		<div
			v-for="(img, i) in images"
			:key="i"
			class="relative group border w-16 rounded-md shadow-xs hover:shadow-lg overflow-hidden">
			<div class="flex items-center justify-center w-full h-full">
				<img
					:src="img"
					alt="Image"
					class="object-cover h-7 cursor-pointer"
					@click="handleViewImage(i)" />
			</div>

			<div
				class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
				<div class="flex gap-2">
					<Dialog>
						<DialogTrigger as-child>
							<Button
								@click.stop="handleViewImage(i)"
								title="Preview"
								class="cursor-pointer w-4 h-4 p-1 hover:scale-125">
								<EyeIcon class="!h-3 !w-3" />
							</Button>
						</DialogTrigger>
						<DialogContent class="!max-w-4xl">
							<DialogHeader>
								<DialogTitle>Images</DialogTitle>
								<DialogDescription />
							</DialogHeader>
							<div
								class="rounded-xl p-4 flex flex-col items-center max-w-4xl">
								<div
									:class="
										zoom === 1
											? 'cursor-default'
											: 'cursor-grab active:cursor-grabbing'
									"
									class="flex-1 w-full overflow-hidden flex items-center justify-center relative rounded-md"
									@mousedown="startDrag"
									@mousemove="onDrag"
									@mouseup="endDrag"
									@mouseleave="endDrag">
									<img
										:src="activeImage"
										alt="Current Image"
										class="h-[50vh] w-full object-contain transition-transform"
										:style="zoomedStyle"
										draggable="false"
										@wheel="onWheelZoom" />
									<Button
										:disabled="activeImageIndex === 0"
										variant="outline"
										@click.stop="handlePrevImage"
										class="absolute left-2 top-1/2 -translate-y-1/2 shadow-md z-10 w-0.5 h-8 cursor-pointer"
										>←</Button
									>
									<Button
										:disabled="
											activeImageIndex ===
											images.length - 1
										"
										variant="outline"
										@click.stop="handleNextImage"
										class="absolute right-2 top-1/2 -translate-y-1/2 shadow-md z-10 w-0.5 h-8 cursor-pointer"
										>→</Button
									>
								</div>
							</div>
							<DialogFooter>
								<div
									class="mt-4 flex flex-col sm:flex-row sm:justify-between items-center gap-3 text-sm px-4 w-full">
									<div
										class="text-center sm:text-left w-full sm:w-auto text-primary">
										<p class="truncate max-w-xs">
											<strong>{{ activeImage }}</strong>
										</p>
										<!-- <p>{{ formatSize(activeImage.size) }}</p> -->
									</div>

									<div
										class="flex gap-2 flex-wrap justify-center">
										<Button
											:disabled="zoom >= ZOOM_MAX"
											variant="secondary"
											class="cursor-pointer"
											@click="zoomIn"
											>+</Button
										>
										<Button
											:disabled="zoom <= ZOOM_MIN"
											variant="secondary"
											class="cursor-pointer"
											@click="zoomOut"
											>-</Button
										>
										<Button
											variant="secondary"
											class="cursor-pointer"
											@click="resetZoom"
											>100%</Button
										>
										<Button
											variant="secondary"
											class="cursor-pointer"
											title="Open in new tab">
											<a
												:href="activeImage"
												target="_blank">
												<ExternalLinkIcon
													class="w-4 h-4" />
											</a>
										</Button>
									</div>
								</div>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					<Button
						v-if="props.canDelete"
						@click.stop="removeImage(i)"
						title="Delete"
						class="cursor-pointer w-4 h-4 p-1 hover:scale-125"
						variant="destructive">
						<Trash2Icon class="!w-3 !h-3" />
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>
