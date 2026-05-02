<!--
  ChapterMap
  ==========
  Horizontal "map track" that renders a chapter's station nodes connected
  by a dashed line, with a solid orange progress segment growing from the
  left as the user completes stations.
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
const lineWidth = ref(0);

/** Recompute the orange progress line width whenever progress changes. */
async function updateProgressLine() {
	await nextTick();
	const track = trackEl.value;
	if (!track) return;
	const completed = props.chapter.stations.filter(
		(_, i) => props.statusFor(props.chapter.num, i) === "completed",
	).length;
	if (completed === 0) {
		lineWidth.value = 0;
		return;
	}
	const nodes = track.querySelectorAll<HTMLElement>("[data-node]");
	if (!nodes.length) return;
	const trackRect = track.getBoundingClientRect();
	const lastDoneNode = nodes[completed - 1];
	if (!lastDoneNode) {
		lineWidth.value = 0;
		return;
	}
	const lastRect = lastDoneNode.getBoundingClientRect();
	const width = lastRect.left + lastRect.width / 2 - trackRect.left - 70;
	lineWidth.value = Math.max(0, width);
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
		class="relative z-[5] border-b border-[#222c3e] py-[22px] pb-6"
		:class="{ 'pointer-events-none opacity-50': locked }"
	>
		<!-- Chapter intro -->
		<div class="relative max-w-[920px] px-12 pt-3 pb-[18px]">
			<div
				class="mb-1 font-fraunces text-[clamp(24px,2.8vw,32px)] font-normal leading-[1.15] tracking-[-0.01em] text-[#e8ecf3]"
			>
				{{ chapterLabel }}
			</div>
			<p
				v-if="chapter.subtitle"
				class="m-0 font-fraunces text-[15px] italic font-normal leading-[1.5] text-[#6b7689]"
			>
				{{ chapter.subtitle }}
			</p>
			<div
				v-if="locked"
				class="mt-3 inline-flex items-center gap-2 rounded-[3px] border border-[#222c3e] bg-[#111826] px-3 py-1.5 font-mono text-[9px] tracking-[0.25em] uppercase text-[#6b7689]"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="h-2.5 w-2.5 fill-[#6b7689]"
					aria-hidden="true"
				>
					<path d="M17 8V7a5 5 0 0 0-10 0v1H5v13h14V8h-2zm-8-1a3 3 0 1 1 6 0v1H9V7z" />
				</svg>
				Complete the previous chapter to unlock
			</div>
		</div>
		<div
			v-if="chapter.mapHint"
			class="mb-2 flex items-center gap-3.5 px-12 font-mono text-[9px] tracking-[0.3em] uppercase text-[#6b7689] before:content-[''] after:h-px after:flex-1 after:bg-[linear-gradient(90deg,#222c3e_0%,transparent_100%)]"
		>
			{{ chapter.mapHint }}
		</div>

		<!--
			Map. On desktop the track fills the wrapper exactly
			(`min-w-full justify-between`) and stations flex-share that
			width (see StationNode) so no scrollbar is needed and all
			stations are visible at once.

			Below 760px the track switches to `min-w-max justify-start`
			and stations become fixed 160px-wide (StationNode mobile
			rule), so the inner content overflows the wrapper and
			`overflow-x-auto` exposes a horizontal scrollbar. Mirrors
			the reference HTML's `.map-scroll` + `.map-track` mobile
			rules exactly.
		-->
		<div class="story-map-scroll overflow-x-auto overflow-y-visible px-6 pb-2.5 md:px-12">
			<div
				ref="trackEl"
				class="relative flex min-w-full items-start justify-between pt-6 pb-2 max-[760px]:min-w-max max-[760px]:justify-start"
			>
				<!-- dashed background line -->
				<div
					class="absolute top-[45px] right-[50px] left-[50px] z-0 h-0.5 bg-[repeating-linear-gradient(90deg,#222c3e_0,#222c3e_8px,transparent_8px,transparent_16px)]"
				/>
				<!-- solid progress segment -->
				<div
					class="absolute top-[45px] left-[50px] z-[1] h-0.5 bg-[linear-gradient(90deg,#e8a951_0%,#c08537_100%)] [box-shadow:0_0_12px_rgba(232,169,81,0.4)] transition-[width] duration-700"
					:style="{ width: `${lineWidth}px` }"
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

<style scoped>
/*
	Slim horizontal scrollbar matching the original `.map-scroll`. The
	track grows to its natural width via `w-max` so all nodes render at
	their fixed width and the scrollbar appears only when the chapter
	exceeds the available horizontal space.
*/
.story-map-scroll {
	scrollbar-width: thin;
	scrollbar-color: #222c3e transparent;
}
.story-map-scroll::-webkit-scrollbar {
	height: 6px;
}
.story-map-scroll::-webkit-scrollbar-track {
	background: transparent;
}
.story-map-scroll::-webkit-scrollbar-thumb {
	background: #222c3e;
	border-radius: 4px;
}
.story-map-scroll::-webkit-scrollbar-thumb:hover {
	background: #6b7689;
}
</style>
