<!--
  StoryDiagramLightbox
  ====================
  Full-viewport lightbox shown when a user clicks an inline diagram.
  Mirrors the .diagram-lightbox styling from the reference HTML, ported
  to tailwind utility classes.
-->
<script setup lang="ts">
import { computed } from "vue";
import StoryDiagram from "./StoryDiagram.vue";

interface Props {
	open: boolean;
	/** SVG URL — same field that lives on the JSON diagram refs. */
	src: string | null;
	caption?: string;
}

const props = withDefaults(defineProps<Props>(), {
	caption: "",
	src: null,
});

const emit = defineEmits<{
	close: [];
}>();

const isOpen = computed(() => props.open && !!props.src);

function close() {
	emit("close");
}

/** Backdrop click closes; clicks inside the inner panel do not. */
function onBackdropClick(e: MouseEvent) {
	if (e.target === e.currentTarget) close();
}
</script>

<template>
	<Teleport to="body">
		<div
			v-show="isOpen"
			class="fixed inset-0 z-[1000] flex cursor-zoom-out items-center justify-center bg-[rgba(5,8,17,0.92)] p-10 backdrop-blur-md transition-opacity duration-200"
			:class="
				isOpen
					? 'opacity-100 pointer-events-auto'
					: 'opacity-0 pointer-events-none'
			"
			@click="onBackdropClick"
		>
			<div
				class="relative max-h-[90vh] w-full max-w-[min(1400px,95vw)] cursor-default overflow-auto rounded-[14px] border border-[#222c3e] bg-[#111826] px-9 pt-8 pb-6 [box-shadow:0_20px_60px_rgba(0,0,0,0.6)]"
			>
				<button
					class="absolute top-4 right-4 z-[2] flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#222c3e] bg-[#050811] text-[18px] text-[#b4becf] transition-[background,color,border-color] duration-200 hover:border-[#c08537] hover:bg-[#1a2030] hover:text-[#e8ecf3]"
					title="Close"
					@click="close"
				>
					✕
				</button>
				<StoryDiagram
					v-if="src"
					:src="src"
					:caption="caption"
					mode="lightbox"
				/>
			</div>
		</div>
	</Teleport>
</template>
