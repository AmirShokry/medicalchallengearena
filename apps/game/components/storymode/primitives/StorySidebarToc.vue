<!--
  StorySidebarToc
  ===============
  The fixed-position right sidebar from the reference HTML — "All
  stations". Lists every chapter as a collapsible group; inside each
  chapter, every station is a clickable row with a status badge
  (✓/●/✕). Stations with a stepFlow can be expanded inline to preview
  each step's insight.

  Scroll model (matches the reference):
    - The aside fills the viewport vertically (top: 16, bottom: 16).
    - The header is fixed-height (`shrink-0`) at the top.
    - The body is the only scrolling container — it is the *single*
      `overflow-y: auto` element in the chain. Every chapter, every
      station, every step is laid out at its natural height inside
      the body so users can scroll all 35 stations + every step
      preview end-to-end.
-->
<script setup lang="ts">
import { computed, reactive } from "vue";
import type {
	StationStatus,
	StoryStation,
	StorySystem,
} from "@/composables/storymode/types";

interface Props {
	system: StorySystem;
	statusFor: (chapterNum: number, stationIdx: number) => StationStatus;
	chapterDoneCount: (num: number) => number;
}
const props = defineProps<Props>();

const emit = defineEmits<{
	stationClick: [chapterNum: number, stationIdx: number];
}>();

/**
 * Per-chapter collapsed flag. Reactive Map keyed by chapter num. All
 * chapters start expanded so users can scan everything at once.
 */
const collapsed = reactive<Record<number, boolean>>({});

/**
 * Per-station expanded flag (for the steps preview). Keyed as
 * `${chapterNum}-${stationIdx}` to avoid collisions.
 */
const stationExpanded = reactive<Record<string, boolean>>({});

function toggleChapter(num: number) {
	collapsed[num] = !collapsed[num];
}

function expandAll(expand: boolean) {
	for (const c of props.system.chapters) collapsed[c.num] = !expand;
}

function stationKey(chapterNum: number, stationIdx: number) {
	return `${chapterNum}-${stationIdx}`;
}

function toggleStationSteps(chapterNum: number, stationIdx: number) {
	const key = stationKey(chapterNum, stationIdx);
	stationExpanded[key] = !stationExpanded[key];
}

function statusIcon(s: StationStatus) {
	return s === "completed" ? "✓" : s === "available" ? "●" : "✕";
}

function tocStripHtml(s: string | null | undefined) {
	if (!s) return "";
	return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function stepItemsFor(station: StoryStation) {
	if (!station.stepFlow) return [];
	return station.stepFlow.flow.filter((f) => f.type === "step");
}

function onRowClick(
	chapterNum: number,
	stationIdx: number,
	status: StationStatus,
) {
	if (status === "locked") return;
	emit("stationClick", chapterNum, stationIdx);
}

const chapterCounts = computed(() =>
	Object.fromEntries(
		props.system.chapters.map((c) => [
			c.num,
			{ done: props.chapterDoneCount(c.num), total: c.stations.length },
		]),
	),
);
</script>

<template>
	<aside
		class="story-toc-sidebar fixed top-4 right-4 bottom-4 z-[80] flex w-[320px] flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-0.5 before:rounded-tl-xl before:rounded-tr-xl before:bg-[linear-gradient(90deg,transparent_0%,#e8a951_50%,transparent_100%)] before:opacity-35 before:content-['']
		max-[1240px]:w-[280px]
		max-[1100px]:hidden"
	>
		<!-- Header (fixed-height, never scrolls) -->
		<div class="shrink-0 px-4 pt-4 pb-3">
			<div
				class="mb-2 font-jetbrains text-[9px] tracking-[0.3em] uppercase text-[#e8a951]"
			>
				All stations
			</div>
			<div class="flex gap-1.5">
				<button
					type="button"
					class="flex-1 cursor-pointer rounded border border-border bg-transparent px-1.5 py-1 font-jetbrains text-[9px] tracking-[0.18em] uppercase text-muted-foreground transition-[border-color,color] duration-200 hover:border-[#e8a951] hover:text-[#e8a951]"
					@click="expandAll(true)"
				>
					Expand all
				</button>
				<button
					type="button"
					class="flex-1 cursor-pointer rounded border border-border bg-transparent px-1.5 py-1 font-jetbrains text-[9px] tracking-[0.18em] uppercase text-muted-foreground transition-[border-color,color] duration-200 hover:border-[#e8a951] hover:text-[#e8a951]"
					@click="expandAll(false)"
				>
					Collapse all
				</button>
			</div>
		</div>

		<!-- Body — the single scrolling container. min-h-0 lets it shrink
		     inside the flex parent so it actually scrolls instead of pushing
		     the bottom of the sidebar off-screen. -->
		<div
			class="story-toc-body min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-[18px]"
		>
			<div
				v-for="chapter in system.chapters"
				:key="chapter.num"
				class="mb-2 overflow-hidden rounded-lg border border-border bg-background/55"
			>
				<!-- Chapter header -->
				<div
					class="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors duration-200 select-none hover:bg-[rgba(232,169,81,0.04)]"
					@click="toggleChapter(chapter.num)"
				>
					<span
						class="flex h-3 w-3 flex-none items-center justify-center text-[#e8a951] transition-transform duration-200"
						:class="collapsed[chapter.num] ? '-rotate-90' : 'rotate-0'"
					>
						▾
					</span>
					<span
						class="flex-none font-jetbrains text-[9px] tracking-[0.22em] uppercase text-muted-foreground"
					>
						Chapter {{ String(chapter.num).padStart(2, "0") }}
					</span>
					<span
						class="flex-1 font-fraunces text-[13px] leading-[1.25] text-foreground"
					>
						{{ chapter.title }}
					</span>
					<span
						class="flex-none rounded-[3px] px-1.5 py-0.5 font-jetbrains text-[10px]"
						:class="
							(chapterCounts[chapter.num]?.done ?? 0) ===
								(chapterCounts[chapter.num]?.total ?? 0) &&
							(chapterCounts[chapter.num]?.total ?? 0) > 0
								? 'bg-[rgba(79,184,168,0.15)] text-[#4fb8a8]'
								: 'bg-muted text-muted-foreground'
						"
					>
						{{ chapterCounts[chapter.num]?.done ?? 0 }} /
						{{ chapterCounts[chapter.num]?.total ?? 0 }}
					</span>
				</div>

				<!--
					Stations container. v-show (rather than max-height: 0/N)
					lets the container have its natural height when expanded,
					so the outer scroll computes correctly across all 4 chapters
					at once.
				-->
				<div v-show="!collapsed[chapter.num]" class="px-0 pt-0.5 pb-1.5">
					<div
						v-for="(station, idx) in chapter.stations"
						:key="idx"
						class="border-t border-border/60 first:border-t-0"
						:class="{
							'opacity-70 dark:opacity-45':
								statusFor(chapter.num, idx) === 'locked',
						}"
					>
						<div
							class="grid cursor-pointer grid-cols-[22px_1fr_22px] items-center gap-2.5 px-3 py-2 transition-colors duration-200 hover:bg-[rgba(232,169,81,0.04)]"
							:class="{
								'cursor-not-allowed hover:bg-transparent':
									statusFor(chapter.num, idx) === 'locked',
							}"
							@click="onRowClick(chapter.num, idx, statusFor(chapter.num, idx))"
						>
							<div
								class="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[9px] font-bold"
								:class="
									statusFor(chapter.num, idx) === 'completed'
										? 'border-[#4fb8a8] bg-[#4fb8a8] text-background border-[1.5px]'
										: statusFor(chapter.num, idx) === 'available'
											? 'border-[#e8a951] text-[#e8a951] border-[1.5px]'
											: 'border-muted-foreground text-muted-foreground border-[1.5px] border-dashed'
								"
							>
								{{ statusIcon(statusFor(chapter.num, idx)) }}
							</div>
							<div class="flex min-w-0 flex-col gap-px">
								<div
									class="truncate font-fraunces text-[13px] leading-[1.25]"
									:class="
										statusFor(chapter.num, idx) === 'completed'
											? 'text-muted-foreground'
											: 'text-foreground'
									"
								>
									{{ station.title }}
								</div>
								<div
									v-if="station.subtitle"
									class="truncate font-fraunces text-[11px] italic leading-[1.3] text-muted-foreground"
								>
									{{ station.subtitle }}
								</div>
							</div>
							<button
								type="button"
								class="flex h-5 w-5 cursor-pointer items-center justify-center rounded-[3px] border bg-transparent p-0 text-[10px] transition-[transform,border-color] duration-200"
								:class="[
									stationExpanded[stationKey(chapter.num, idx)]
										? 'rotate-90 border-[#e8a951] text-[#e8a951]'
										: 'border-border text-muted-foreground hover:border-[#e8a951] hover:text-[#e8a951]',
									stepItemsFor(station).length === 0 ? 'invisible' : '',
								]"
								aria-label="Preview steps"
								@click.stop="toggleStationSteps(chapter.num, idx)"
							>
								›
							</button>
						</div>
						<!-- Per-step preview -->
						<div
							v-if="
								stationExpanded[stationKey(chapter.num, idx)] &&
								stepItemsFor(station).length > 0
							"
							class="px-3 pt-0.5 pb-3 pl-11"
						>
							<div
								v-for="step in stepItemsFor(station)"
								:key="step.n"
								class="flex gap-2 py-[3px] font-inter text-[11px] leading-[1.4] text-muted-foreground"
							>
								<span
									class="min-w-[18px] font-jetbrains text-[9.5px] font-semibold text-[#e8a951]"
								>
									{{ String(step.n).padStart(2, "0") }}
								</span>
								<span class="flex-1">
									{{ tocStripHtml(step.insight || step.text) }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</aside>
</template>

<style scoped>
/*
	Slim scrollbar styling for the body. Tailwind v4 doesn't ship a
	one-shot utility for `::-webkit-scrollbar`, so we drop the original
	reference HTML's rules in here scoped to this component.
*/
.story-toc-body {
	scrollbar-width: thin;
	scrollbar-color: var(--border) transparent;
}
.story-toc-body::-webkit-scrollbar {
	width: 6px;
}
.story-toc-body::-webkit-scrollbar-track {
	background: transparent;
}
.story-toc-body::-webkit-scrollbar-thumb {
	background: var(--border);
	border-radius: 3px;
}
.story-toc-body::-webkit-scrollbar-thumb:hover {
	background: var(--muted-foreground);
}
</style>
