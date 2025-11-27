<script setup lang="ts">
import { EyeIcon, ExternalLinkIcon } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const props = defineProps<{
  imgUrls: string[];
}>();

const showModal = ref(false);

const activeImageIndex = ref<number | null>(0);
const activeImage = computed((): string => {
  if (
    activeImageIndex.value !== null &&
    props.imgUrls !== null &&
    activeImageIndex.value >= 0 &&
    activeImageIndex.value < props.imgUrls.length
  ) {
    return props.imgUrls[activeImageIndex.value] as string;
  }
  return "";
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

function handleCloseModal() {
  showModal.value = false;
  resetZoom();
}

function handlePrevImage() {
  if (props.imgUrls.length < 2 || activeImageIndex.value === null) return;
  activeImageIndex.value =
    (activeImageIndex.value - 1 + props.imgUrls.length) % props.imgUrls.length;
  resetZoom();
}

function handleNextImage() {
  if (props.imgUrls.length < 2 || activeImageIndex.value === null) return;
  activeImageIndex.value = (activeImageIndex.value + 1) % props.imgUrls.length;
  resetZoom();
}

const zoomedStyle = computed(() => ({
  transform: `scale(${zoom.value}) translate(${drag.offset.x}px, ${drag.offset.y}px)`,
  transition: drag.isDragging ? "none" : "transform 0.3s",
}));

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

function onDrag(e: MouseEvent) {
  if (!drag.isDragging) return;
  const dx = e.clientX - drag.start.x;
  const dy = e.clientY - drag.start.y;
  drag.offset.x += dx;
  drag.offset.y += dy;
  drag.start = { x: e.clientX, y: e.clientY };
}

function endDrag() {
  drag.isDragging = false;
}

function onWheelZoom(e: WheelEvent) {
  e.preventDefault();
  if (e.deltaY < 0) zoomIn();
  else zoomOut();
}

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
  <div v-if="imgUrls.length" class="flex gap-1">
    <div
      v-for="(img, i) in imgUrls"
      :key="i"
      class="relative group border border-border w-14 h-10 rounded-md shadow-xs hover:shadow-lg overflow-hidden bg-muted"
    >
      <div class="flex items-center justify-center w-full h-full">
        <img
          :src="img"
          alt="image"
          loading="lazy"
          class="object-cover h-full w-full cursor-pointer"
          @click="handleViewImage(i)"
        />
      </div>

      <div
        class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
      >
        <div class="flex gap-2">
          <Dialog>
            <DialogTrigger as-child>
              <Button
                @click.stop="handleViewImage(i)"
                title="Preview"
                size="icon"
                variant="ghost"
                class="cursor-pointer w-6 h-6 p-1 hover:scale-110"
              >
                <EyeIcon class="!h-4 !w-4 text-white" />
              </Button>
            </DialogTrigger>
            <DialogContent class="!max-w-4xl">
              <DialogHeader>
                <DialogTitle>Images</DialogTitle>
                <DialogDescription />
              </DialogHeader>
              <div class="rounded-xl p-4 flex flex-col items-center max-w-4xl">
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
                  @mouseleave="endDrag"
                >
                  <img
                    :src="activeImage"
                    alt="active image"
                    class="h-[50vh] w-full object-contain transition-transform"
                    :style="zoomedStyle"
                    draggable="false"
                    @wheel="onWheelZoom"
                  />
                  <Button
                    :disabled="activeImageIndex === 0"
                    variant="outline"
                    @click.stop="handlePrevImage"
                    class="absolute left-2 top-1/2 -translate-y-1/2 shadow-md z-10 w-8 h-8 cursor-pointer"
                    >←</Button
                  >
                  <Button
                    :disabled="activeImageIndex === imgUrls.length - 1"
                    variant="outline"
                    @click.stop="handleNextImage"
                    class="absolute right-2 top-1/2 -translate-y-1/2 shadow-md z-10 w-8 h-8 cursor-pointer"
                    >→</Button
                  >
                </div>
              </div>
              <DialogFooter>
                <div
                  class="mt-4 flex flex-col sm:flex-row sm:justify-between items-center gap-3 text-sm px-4 w-full"
                >
                  <div
                    class="text-center sm:text-left w-full sm:w-auto text-primary"
                  >
                    <p class="truncate max-w-xs">
                      <strong>
                        Image
                        {{
                          activeImageIndex !== null
                            ? activeImageIndex + 1
                            : undefined
                        }}</strong
                      >
                    </p>
                  </div>

                  <div class="flex gap-2 flex-wrap justify-center">
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
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  </div>
</template>
