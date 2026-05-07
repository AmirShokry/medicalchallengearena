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
function onClick() {
	close();
}
</script>

<template>
	<Teleport to="body">
		<div
			v-show="isOpen"
			class="fixed inset-0 z-[100000] flex cursor-zoom-out items-center justify-center bg-background/95 p-10 backdrop-blur-md transition-opacity duration-200"
			:class="
				isOpen
					? 'opacity-100 pointer-events-auto'
					: 'opacity-0 pointer-events-none'
			"
			@click="onClick"
		>
			<!--
				Inner panel. Spans the full width of the outer flex
				container (the outer's `p-10` already gives a small margin
				on every side). Laid out as a column so the SVG flexes
				to fill the remaining space below the close button. No
				`overflow-auto` — the SVG is vector, so `object-contain`
				shrinks it to fit the box rather than scrolling.
			-->
			<div
				class="relative flex h-full w-full cursor-zoom-out flex-col overflow-hidden rounded-[14px] border border-border bg-card px-9 pt-8 pb-6 shadow-2xl"
			>
				<button
					class="absolute top-4 right-4 z-[2] flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#c08537] bg-background text-[18px] text-muted-foreground transition-[background,color,border-color] duration-200 hover:bg-secondary hover:text-foreground"
					title="Close"
					@click="close"
				>
					X
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
