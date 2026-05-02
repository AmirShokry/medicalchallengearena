<!--
  StorySidebarJourney
  ===================
  The fixed-position left sidebar from the reference HTML — "Your
  Journey". Shows the system's overall progress and a stack of chapter
  cards (each with the chapter's hero SVG, name, count, and a per-chapter
  mini progress bar).

  Click a chapter card to scroll to its row inside the parent system map.
  Locked chapters show as dim/non-interactive.
-->
<script setup lang="ts">
import { computed } from "vue";
import type { StorySystem } from "@/composables/storymode/types";

interface Props {
	system: StorySystem;
	totalCompleted: number;
	totalStations: number;
	chapterDoneCount: (num: number) => number;
	isChapterLocked: (num: number) => boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
	chapterClick: [chapterNum: number];
}>();

const overallPct = computed(() =>
	props.totalStations > 0
		? (props.totalCompleted / props.totalStations) * 100
		: 0,
);

function chapterPct(num: number) {
	const ch = props.system.chapters.find((c) => c.num === num);
	if (!ch || ch.stations.length === 0) return 0;
	return (props.chapterDoneCount(num) / ch.stations.length) * 100;
}

function onChapterClick(ch: { num: number }) {
	if (props.isChapterLocked(ch.num)) return;
	emit("chapterClick", ch.num);
}
</script>

<template>
	<aside
		class="story-journey-sidebar fixed top-4 bottom-4 left-4 z-[80] flex w-[280px] flex-col overflow-hidden rounded-xl border border-border bg-card/95 px-4 py-[18px] shadow-2xl backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-0.5 before:rounded-tl-xl before:rounded-tr-xl before:bg-[linear-gradient(90deg,transparent_0%,#e8a951_50%,transparent_100%)] before:opacity-35 before:content-['']
		max-[1240px]:w-[240px] max-[1240px]:px-[14px] max-[1240px]:py-4
		max-[1100px]:hidden"
	>
		<div class="story-journey-body flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pr-1">
			<!-- Header / overall progress -->
			<div class="mb-3.5 flex-none">
				<div
					class="mb-2 font-jetbrains text-[10px] tracking-[0.3em] uppercase text-[#e8a951]"
				>
					Your Journey
				</div>
				<div class="mb-2.5 flex items-baseline gap-1 font-fraunces">
					<span class="text-[28px] font-semibold leading-none text-[#e8a951]">
						{{ totalCompleted }}
					</span>
					<span class="text-[18px] font-light text-muted-foreground">/</span>
					<span class="text-[18px] font-medium text-foreground">{{ totalStations }}</span>
					<span class="ml-2 font-inter text-[9px] tracking-[0.22em] uppercase text-muted-foreground">
						stations
					</span>
				</div>
				<div class="mb-4 h-[5px] overflow-hidden rounded-[3px] bg-[rgba(232,169,81,0.08)]">
					<div
						class="h-full rounded-[3px] bg-[linear-gradient(90deg,#e8a951_0%,#d14859_30%,#9370b9_60%,#4fb8a8_100%)] [box-shadow:0_0_10px_rgba(232,169,81,0.3)] transition-[width] duration-700"
						:style="{ width: `${overallPct}%` }"
					/>
				</div>
			</div>

			<!-- Chapter cards -->
			<div class="flex flex-col gap-2.5">
				<button
					v-for="chapter in system.chapters"
					:key="chapter.num"
					type="button"
					class="relative flex flex-col gap-2 overflow-hidden rounded-lg border bg-background/55 p-3 text-left transition-all duration-200 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:opacity-85 before:content-['']"
					:class="[
						isChapterLocked(chapter.num)
							? 'cursor-default opacity-70 dark:opacity-50 border-border'
							: 'cursor-pointer hover:-translate-y-px',
						chapterDoneCount(chapter.num) === chapter.stations.length &&
						chapter.stations.length > 0
							? 'border-[rgba(79,184,168,0.45)]'
							: 'border-border',
					]"
					:style="{ '--chapter-color': chapter.color || '#e8a951' }"
					@click="onChapterClick(chapter)"
				>
					<!-- Per-chapter accent stripe (left). Inline so it follows
					     each chapter's color from the JSON — no class explosion. -->
					<span
						class="absolute left-0 top-0 bottom-0 w-[3px] opacity-85"
						:style="{ background: chapter.color || '#e8a951' }"
					/>
					<!-- Hero art -->
					<div
						class="flex h-20 w-full items-center justify-center rounded-md bg-background/70"
					>
						<img
							v-if="chapter.heroSrc"
							:src="chapter.heroSrc"
							alt=""
							class="h-full w-[80%] object-contain"
							draggable="false"
						/>
					</div>
					<!-- Meta -->
					<div class="flex min-w-0 flex-col gap-1">
						<div
							class="font-jetbrains text-[9px] tracking-[0.22em] uppercase"
							:style="{ color: chapter.color || '#6b7689' }"
						>
							Chapter {{ String(chapter.num).padStart(2, "0") }}
						</div>
						<div class="font-fraunces text-[13.5px] leading-[1.25] text-foreground">
							{{ chapter.title }}
						</div>
						<div
							class="flex items-center gap-2 font-jetbrains text-[9.5px] text-muted-foreground"
						>
							<span>
								<span
									class="font-bold"
									:class="
										chapterDoneCount(chapter.num) === chapter.stations.length &&
										chapter.stations.length > 0
											? 'text-[#4fb8a8]'
											: 'text-[#e8a951]'
									"
								>
									{{ chapterDoneCount(chapter.num) }}</span
								>/{{ chapter.stations.length }}
							</span>
							<div
								class="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-muted"
							>
								<div
									class="h-full rounded-[2px] transition-[width] duration-500"
									:style="{
										width: `${chapterPct(chapter.num)}%`,
										background: chapter.color || '#e8a951',
									}"
								/>
							</div>
						</div>
					</div>
				</button>
			</div>
		</div>
	</aside>
</template>

<style scoped>
.story-journey-body {
	scrollbar-width: thin;
	scrollbar-color: var(--border) transparent;
}
.story-journey-body::-webkit-scrollbar {
	width: 6px;
}
.story-journey-body::-webkit-scrollbar-track {
	background: transparent;
}
.story-journey-body::-webkit-scrollbar-thumb {
	background: var(--border);
	border-radius: 3px;
}
.story-journey-body::-webkit-scrollbar-thumb:hover {
	background: var(--muted-foreground);
}
</style>
