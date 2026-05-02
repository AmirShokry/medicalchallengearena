<!--
  /game/solo/story/[system]
  =========================
  The "map" page for a story-mode system. Renders every chapter as a
  horizontal row of station nodes flanked by two fixed sidebars from the
  reference HTML — "Your Journey" (left) and "All stations" (right).

  Progress (which stations are completed/locked) is kept in localStorage
  and managed by useStoryProgress.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChapterMap from "@/components/storymode/primitives/ChapterMap.vue";
import StoryLoader from "@/components/storymode/primitives/StoryLoader.vue";
import StorySidebarJourney from "@/components/storymode/primitives/StorySidebarJourney.vue";
import StorySidebarToc from "@/components/storymode/primitives/StorySidebarToc.vue";
import { useStoryProgress } from "@/composables/storymode/useStoryProgress";
import type { StorySystem } from "@/composables/storymode/types";

// Vite resolves the asset URL at build time so the file under
// `apps/game/assets/images/logo.png` is fingerprinted and served from
// `_nuxt/...` at runtime.
import logoUrl from "~/assets/images/logo.png";

definePageMeta({
	layout: "blank",
});

const route = useRoute();
const router = useRouter();
const { $trpc } = useNuxtApp();

/** Typed accessor for this route's params — Nuxt typedPages emits a union
 * across all routes for `route.params`, so we narrow to this page's shape. */
const params = computed(() => route.params as { system: string });
const systemName = computed(() => params.value.system);

const { data: system, pending } = await useAsyncData(
	() => `storymode-system-${systemName.value}`,
	() =>
		$trpc.storymode.system.query({ name: systemName.value }) as Promise<StorySystem>,
	{ watch: [systemName] },
);

useSeoMeta({
	title: () =>
		system.value
			? `MCA | ${system.value.displayName} (Story)`
			: "MCA | Story Mode",
});

const progress = useStoryProgress(() => system.value);

/**
 * Resolve a station's status (completed / available / locked) for the map
 * components — proxies through to the progress composable.
 */
function statusFor(chapterNum: number, stationIdx: number) {
	return progress.getStatus(chapterNum, stationIdx);
}

function openStation(chapterNum: number, stationIdx: number) {
	if (!system.value) return;
	const chapter = system.value.chapters[chapterNum - 1];
	if (!chapter) return;
	const station = chapter.stations[stationIdx];
	if (!station) return;
	router.push(
		`/game/story/solo/${systemName.value}/${chapter.slug}/${station.slug}`,
	);
}

/** Smoothly scroll the chapter into view when the user clicks a card in
 *  the left sidebar — preserves the reference HTML's behaviour. */
function scrollToChapter(num: number) {
	if (typeof window === "undefined") return;
	const el = document.getElementById(`storymode-chapter-${num}`);
	if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetProgress() {
	if (
		typeof window !== "undefined" &&
		!window.confirm(
			"Reset all progress for this system? This will lock all chapters except the first and clear every completed station. This cannot be undone.",
		)
	)
		return;
	progress.reset();
}
</script>

<template>
	<div
		class="min-h-screen bg-[#0a0e1a] font-inter text-[#e8ecf3] [background-attachment:fixed] [background-image:radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(232,169,81,0.04),transparent),radial-gradient(ellipse_60%_80%_at_80%_80%,rgba(209,72,89,0.04),transparent)]"
	>
		<!-- Loading state -->
		<StoryLoader v-if="pending" label="Loading system" class="min-h-screen" />

		<!-- Missing system -->
		<div
			v-else-if="!system"
			class="px-6 py-20 text-center text-[#6b7689] md:px-12"
		>
			This system is not available.
			<NuxtLink to="/game/story/solo" class="text-[#e8a951] underline">
				Back to systems
			</NuxtLink>
		</div>

		<template v-else>
			<!-- Fixed sidebars (left + right). Both auto-hide on narrow viewports. -->
			<StorySidebarJourney
				:system="system"
				:total-completed="progress.totalCompleted.value"
				:total-stations="progress.totalStations.value"
				:chapter-done-count="progress.chapterDoneCount"
				:is-chapter-locked="progress.isChapterLocked"
				@chapter-click="scrollToChapter"
			/>
			<StorySidebarToc
				:system="system"
				:status-for="statusFor"
				:chapter-done-count="progress.chapterDoneCount"
				@station-click="openStation"
			/>

			<!--
				Center column. Sidebars are 280px (left) + 320px (right) plus
				16px gap+breathing on each side. The same margins are dropped at
				1240px / 1100px breakpoints to match the reference HTML.
			-->
			<main
				class="ml-[312px] mr-[352px] transition-[margin] duration-300
				max-[1240px]:ml-[272px] max-[1240px]:mr-[312px]
				max-[1100px]:ml-0 max-[1100px]:mr-0"
			>
				<header
					class="relative z-10 flex flex-wrap items-end justify-between gap-10 px-6 pt-8 pb-5 md:px-12"
				>
					<div>
						<NuxtLink
							to="/game/story/solo"
							class="mb-3 inline-block font-jetbrains text-[10px] tracking-[0.3em] uppercase text-[#6b7689] hover:text-[#e8a951]"
						>
							← Story mode
						</NuxtLink>
						<!--
							MCA brand row. Sits BELOW the "Story mode" link and ABOVE
							the system title — same position as the reference HTML's
							`.brand-row` inside `.branding`. Uses the project's
							`logo.png` asset (imported through Vite so the URL is
							fingerprinted at build).
						-->
						<div class="mb-4 flex items-center gap-3.5">
							<img
								:src="logoUrl"
								alt="MCA logo"
								class="h-13 w-auto opacity-95 [filter:drop-shadow(0_2px_8px_rgba(232,169,81,0.12))] max-md:h-10"
								draggable="false"
							/>
							<div class="flex flex-col gap-0.5 leading-tight">
								<div
									class="font-inter text-[18px] font-extrabold tracking-[0.04em] text-[#e8ecf3] max-md:text-[15px]"
								>
									Medical<span class="text-[#e8a951]">Challenge</span>Arena
								</div>
								<div
									class="font-jetbrains text-[10px] tracking-[0.4em] uppercase text-[#e8a951]"
								>
									High Yield NBME
								</div>
							</div>
						</div>
						<h1
							class="font-fraunces text-[34px] font-light leading-none tracking-[-0.02em] text-[#e8ecf3]"
						>
							{{ system.title.split("·")[0] }}
							<em class="italic font-normal text-[#e8a951]">
								{{
									system.title.split("·").slice(1).join("·").trim() ||
									system.displayName
								}}
							</em>
						</h1>
					</div>
					<div class="text-right font-jetbrains">
						<div
							class="mb-2 text-[10px] tracking-[0.3em] uppercase text-[#6b7689]"
						>
							Total Progress
						</div>
						<div
							class="font-fraunces text-2xl font-light leading-none text-[#e8ecf3]"
						>
							<span class="text-[#e8a951]">
								{{ progress.totalCompleted.value }}
							</span>
							/ {{ progress.totalStations.value }}
						</div>
						<div class="ml-auto mt-2.5 h-0.5 w-40 overflow-hidden bg-[#222c3e]">
							<div
								class="h-full bg-[#e8a951] [box-shadow:0_0_12px_rgba(232,169,81,0.4)] transition-[width] duration-700"
								:style="{
									width:
										progress.totalStations.value > 0
											? (progress.totalCompleted.value /
													progress.totalStations.value) *
													100 +
												'%'
											: '0%',
								}"
							/>
						</div>
						<button
							class="mt-3 cursor-pointer rounded border border-[#222c3e] bg-transparent px-2.5 py-1 font-inter text-[10px] tracking-[0.15em] uppercase text-[#6b7689] transition-all duration-200 hover:border-[#d14859] hover:bg-[rgba(209,72,89,0.08)] hover:text-[#d14859]"
							title="Reset all progress (cannot be undone)"
							@click="resetProgress"
						>
							Reset progress
						</button>
					</div>
				</header>

				<!-- Chapter rows -->
				<div class="pb-16">
					<div
						v-for="chapter in system.chapters"
						:id="`storymode-chapter-${chapter.num}`"
						:key="chapter.num"
					>
						<ChapterMap
							:chapter="chapter"
							:locked="progress.isChapterLocked(chapter.num)"
							:status-for="statusFor"
							@station-click="openStation(chapter.num, $event)"
						/>
					</div>
				</div>
			</main>
		</template>
	</div>
</template>
