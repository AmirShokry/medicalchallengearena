<!--
  ChapterMap
  ==========
  Vertical "map track" that renders a chapter's station nodes connected
  by a dashed line on the left, with a solid orange progress segment
  growing downward as the user completes stations.

  Mirrors the "VERTICAL CHAPTER MAP" rules from
  `MCA adaptive immunity story.html` (chapters 5+ design): each station
  is a horizontal row — dot on the left, three-line text column on the
  right (label / title / subtitle) — and the connector + progress lines
  are vertical strokes pinned to `left: 30px`.
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import StationNode from "./StationNode.vue";
import type {
	StationStatus,
	StoryChapter,
} from "@/composables/storymode/types";

interface Props {
	chapter: StoryChapter;
	/** Whether the entire chapter is gated behind a previous chapter. */
	locked: boolean;
	/** Function returning each station's status (driven by user progress). */
	statusFor: (chapterNum: number, stationIdx: number) => StationStatus;
}
const props = defineProps<Props>();

const emit = defineEmits<{
	stationClick: [stationIdx: number];
}>();

const trackEl = ref<HTMLElement | null>(null);
/** Pixel HEIGHT (top-anchored) of the orange progress segment. */
const lineHeight = ref(0);

/**
 * Recompute the orange progress line's height. The line starts at
 * `top: 30px` of the track (just above the first station's dot) and
 * grows down to the vertical centre of the last completed station's
 * dot, mirroring the reference HTML's progress-line behaviour rotated
 * 90°.
 */
async function updateProgressLine() {
	await nextTick();
	const track = trackEl.value;
	if (!track) return;
	const completed = props.chapter.stations.filter(
		(_, i) => props.statusFor(props.chapter.num, i) === "completed",
	).length;
	if (completed === 0) {
		lineHeight.value = 0;
		return;
	}
	const nodes = track.querySelectorAll<HTMLElement>("[data-node]");
	if (!nodes.length) return;
	const trackRect = track.getBoundingClientRect();
	const lastDoneNode = nodes[completed - 1];
	if (!lastDoneNode) {
		lineHeight.value = 0;
		return;
	}
	const lastRect = lastDoneNode.getBoundingClientRect();
	// 30px is the line's top offset; subtract it so the line height is
	// measured from where the line starts, not from the track top.
	const height = lastRect.top + lastRect.height / 2 - trackRect.top - 30;
	lineHeight.value = Math.max(0, height);
}

watch(
	() => [
		props.chapter.num,
		props.chapter.stations.map((_, i) =>
			props.statusFor(props.chapter.num, i),
		),
	],
	updateProgressLine,
	{ deep: true, immediate: true },
);

onMounted(() => {
	updateProgressLine();
	window.addEventListener("resize", updateProgressLine);
});

const chapterLabel = computed(
	() => `Chapter ${props.chapter.num} · ${props.chapter.title}`,
);
</script>

<template>
	<section
		class="relative z-[5] border-b border-border py-[22px] pb-6"
		:class="{ 'pointer-events-none opacity-70 dark:opacity-50': locked }"
	>
		<!-- Chapter intro -->
		<div class="relative max-w-[920px] px-6 pt-3 pb-[18px] md:px-12">
			<div
				class="mb-1 font-fraunces text-[clamp(24px,2.8vw,32px)] font-normal leading-[1.15] tracking-[-0.01em] text-foreground"
			>
				{{ chapterLabel }}
			</div>
			<p
				v-if="chapter.subtitle"
				class="m-0 font-fraunces text-[15px] italic font-normal leading-[1.5] text-muted-foreground"
			>
				{{ chapter.subtitle }}
			</p>
			<div
				v-if="locked"
				class="mt-3 inline-flex items-center gap-2 rounded-[3px] border border-border bg-card px-3 py-1.5 font-mono text-[9px] tracking-[0.25em] uppercase text-muted-foreground"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="h-2.5 w-2.5 fill-muted-foreground"
					aria-hidden="true"
				>
					<path d="M17 8V7a5 5 0 0 0-10 0v1H5v13h14V8h-2zm-8-1a3 3 0 1 1 6 0v1H9V7z" />
				</svg>
				Complete the previous chapter to unlock
			</div>
		</div>
		<div
			v-if="chapter.mapHint"
			class="mb-2 flex items-center gap-3.5 px-6 font-mono text-[9px] tracking-[0.3em] uppercase text-muted-foreground before:content-[''] after:h-px after:flex-1 after:bg-[linear-gradient(90deg,var(--border)_0%,transparent_100%)] md:px-12"
		>
			{{ chapter.mapHint }}
		</div>

		<!--
			Map. Stations stack vertically; the connector + progress line
			are vertical strokes pinned to `left: 30px`. The wrapper has
			plenty of horizontal padding so the dots align cleanly under
			the chapter intro.
		-->
		<div class="px-6 pb-2.5 md:px-12">
			<div
				ref="trackEl"
				class="relative flex flex-col items-stretch justify-start gap-[18px] py-3"
			>
				<!--
					Dashed background line. Vertical, pinned at `left: 30px`,
					inset top/bottom by 30px so it doesn't poke past the
					first/last station's dot centre.
				-->
				<div
					class="absolute top-[30px] bottom-[30px] left-[30px] z-0 w-0.5 bg-[repeating-linear-gradient(180deg,var(--border)_0,var(--border)_8px,transparent_8px,transparent_16px)]"
				/>
				<!--
					Solid progress segment. Same vertical anchor, dynamic
					`height` driven by `lineHeight` (computed from the last
					completed station's vertical centre).
				-->
				<div
					class="absolute top-[30px] left-[30px] z-[1] w-0.5 bg-[linear-gradient(180deg,#e8a951_0%,#c08537_100%)] [box-shadow:0_0_12px_rgba(232,169,81,0.4)] transition-[height] duration-700"
					:style="{ height: `${lineHeight}px` }"
				/>
				<StationNode
					v-for="(station, i) in chapter.stations"
					:key="i"
					data-node
					:num="i + 1"
					:label="station.label"
					:title="station.title"
					:subtitle="station.subtitle"
					:status="statusFor(chapter.num, i)"
					@click="emit('stationClick', i)"
				/>
			</div>
		</div>
	</section>
</template>
