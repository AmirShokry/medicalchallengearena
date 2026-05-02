<script setup lang="ts">
import { computed } from "vue";
import StoryDiagram from "./StoryDiagram.vue";
import type { StoryDiagramRef } from "@/composables/storymode/types";

interface Props {
	/** The HTML string from the JSON (story / explanation / vignette / etc.) */
	html: string;
	/** Diagrams to interleave at every `<!-- DIAGRAM -->` placeholder, in order. */
	diagrams?: StoryDiagramRef[];
}

const props = withDefaults(defineProps<Props>(), {
	diagrams: () => [],
});

const emit = defineEmits<{
	enlarge: [payload: { src: string; caption: string }];
}>();

/**
 * Build a flat list of segments by splitting the source HTML on the
 * `<!-- DIAGRAM -->` placeholder and pairing each chunk with the
 * corresponding diagram (if any). Each segment becomes a `text` or
 * `diagram` entry in the rendered output.
 *
 * Diagrams without a matching placeholder are appended at the end —
 * matches the reference HTML's fallback behaviour.
 */
const items = computed<
	Array<
		| { kind: "text"; key: string; html: string }
		| { kind: "diagram"; key: string; diagram: StoryDiagramRef }
	>
>(() => {
	const placeholder = "<!-- DIAGRAM -->";
	const parts = props.html.split(placeholder);
	const out: Array<
		| { kind: "text"; key: string; html: string }
		| { kind: "diagram"; key: string; diagram: StoryDiagramRef }
	> = [];

	for (let i = 0; i < parts.length; i++) {
		const html = parts[i] ?? "";
		if (html.trim().length > 0) {
			out.push({ kind: "text", key: `t-${i}`, html });
		}
		const diagram = props.diagrams[i];
		if (diagram) {
			out.push({ kind: "diagram", key: `d-${i}-${diagram.id}`, diagram });
		}
	}
	// Any leftover diagrams (more diagrams than placeholders) are appended.
	for (let i = parts.length; i < props.diagrams.length; i++) {
		const diagram = props.diagrams[i];
		out.push({ kind: "diagram", key: `d-${i}-${diagram?.id!}`, diagram: diagram! });
	}
	return out;
});

function onChildEnlarge(payload: { src: string; caption: string }) {
	emit("enlarge", payload);
}
</script>

<template>
	<div class="story-rich-text font-fraunces text-[16.5px] leading-[1.65] text-[#b4becf]">
		<template v-for="item in items" :key="item.key">
			<div
				v-if="item.kind === 'text'"
				class="story-rich-text-frag"
				v-html="item.html"
			/>
			<StoryDiagram
				v-else-if="item.kind === 'diagram'"
				:src="item.diagram.src"
				:caption="item.diagram.caption || ''"
				@enlarge="onChildEnlarge"
			/>
		</template>
	</div>
</template>

<style scoped>
/*
	`.story-rich-text-frag` uses `display: contents` so the wrapper does
	not show up in the layout — block elements inside (p, ul, etc.) become
	direct children of `.story-rich-text` and flow naturally next to the
	interleaved <StoryDiagram> components.
*/
.story-rich-text-frag {
	display: contents;
}

/*
	Selectors below match the inline classes the source HTML embeds inside
	the story/explanation strings (`<span class="highlight">`,
	`<ul class="pathway-list">`, etc.). They are kept as scoped CSS rather
	than tailwind utility classes because they target inner v-html content
	the templating engine can't reach.

	IMPORTANT: never tweak this away from the visual reference — the SVG
	files inside `story` placeholders depend on the surrounding prose
	colors/spacing being identical.
*/
.story-rich-text :deep(p) {
	margin: 0 0 20px;
}
.story-rich-text :deep(strong) {
	color: #e8ecf3;
	font-weight: 600;
}
.story-rich-text :deep(em) {
	font-style: italic;
	color: #e8a951;
}
.story-rich-text :deep(.highlight) {
	background: linear-gradient(180deg, transparent 60%, rgba(232, 169, 81, 0.2) 60%);
	padding: 0 2px;
	color: #e8ecf3;
}
.story-rich-text :deep(.pathway-list) {
	list-style: none;
	padding: 0;
	margin: 20px 0 24px;
	counter-reset: step;
}
.story-rich-text :deep(.pathway-list li) {
	position: relative;
	padding: 12px 0 12px 52px;
	border-bottom: 1px solid #222c3e;
	font-family: "Fraunces", serif;
	font-size: 16px;
	line-height: 1.5;
	color: #b4becf;
}
.story-rich-text :deep(.pathway-list li:last-child) {
	border-bottom: none;
}
.story-rich-text :deep(.pathway-list li::before) {
	counter-increment: step;
	content: "0" counter(step);
	position: absolute;
	left: 0;
	top: 14px;
	font-family: "JetBrains Mono", monospace;
	font-size: 13px;
	font-weight: 600;
	color: #e8a951;
	letter-spacing: 0.05em;
}
.story-rich-text :deep(.pathway-list li strong) {
	color: #e8ecf3;
	font-weight: 600;
}
</style>
