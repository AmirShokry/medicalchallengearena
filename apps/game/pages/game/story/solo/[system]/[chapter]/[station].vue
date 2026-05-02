<!--
  /game/solo/story/[system]/[chapter]/[station]
  =============================================
  The most complex story-mode route. Renders one of three "modes" based
  on the `?mode=` query parameter:

    - default: question + previously-on/stage panels (QUESTION mode).
    - ?mode=review&step=N : the step-flow walkthrough overlay (jumps to
      the step number passed in via `?step=`).
    - ?mode=explanation : the post-answer two-column layout with story,
      explanation, what's-next, optional practice bank, and a "Continue
      the journey" button that completes the station.

  We drive UI state from query params so the user can deep-link directly
  to a specific step, share a review URL, etc. Internal user actions
  (selecting an answer, clicking "Review the concept") update the URL
  rather than local state.
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import StoryQuestionCard from "@/components/storymode/primitives/StoryQuestionCard.vue";
import StoryRichText from "@/components/storymode/primitives/StoryRichText.vue";
import StoryDiagramLightbox from "@/components/storymode/primitives/StoryDiagramLightbox.vue";
import StoryStepFlow from "@/components/storymode/primitives/StoryStepFlow.vue";
import StoryLoader from "@/components/storymode/primitives/StoryLoader.vue";
import { useStoryProgress } from "@/composables/storymode/useStoryProgress";
import type { StorySystem } from "@/composables/storymode/types";

definePageMeta({ layout: "blank" });

const route = useRoute();
const router = useRouter();
const { $trpc } = useNuxtApp();

// =====================================================================
// Route param + query plumbing
// =====================================================================

/** Typed accessor for this route's params — Nuxt typedPages emits a union
 * across all routes for `route.params`, so we narrow to this page's shape. */
const params = computed(
	() => route.params as { system: string; chapter: string; station: string },
);
const systemName = computed(() => params.value.system);
const chapterParam = computed(() => params.value.chapter);
const stationParam = computed(() => params.value.station);

const mode = computed(() => {
	const m = String(route.query.mode || "");
	return m === "review" || m === "explanation" ? m : "question";
});
const stepQuery = computed(() => {
	const s = Number(route.query.step);
	return Number.isFinite(s) && s >= 1 ? s : null;
});

// =====================================================================
// Data
// =====================================================================

const { data: system, pending } = await useAsyncData(
	() => `storymode-system-${systemName.value}`,
	() =>
		$trpc.storymode.system.query({ name: systemName.value }) as Promise<StorySystem>,
	{ watch: [systemName] },
);

const chapter = computed(() =>
	system.value?.chapters.find((c) => c.slug === chapterParam.value) ?? null,
);

const station = computed(() =>
	chapter.value?.stations.find((s) => s.slug === stationParam.value) ?? null,
);

const isLastInChapter = computed(() => {
	if (!chapter.value || !station.value) return false;
	return station.value.idx === chapter.value.stations.length - 1;
});

useSeoMeta({
	title: () =>
		station.value
			? `MCA | ${station.value.title}`
			: "MCA | Story Mode",
});

// =====================================================================
// Progress + question state
// =====================================================================

const progress = useStoryProgress(() => system.value);

/** The user's selected answer letter, persisted only in memory. */
const selected = ref<string | null>(null);
/** True once the user has picked an answer. */
const answered = computed(() => selected.value !== null);

/** Practice bank: per-question revealed state. */
const bankRevealed = ref<Record<number, string>>({});
/** Practice bank: whether the bank panel itself is open. */
const bankOpen = ref(false);

// =====================================================================
// Lightbox state (click-to-zoom on inline diagrams)
// =====================================================================

const lightbox = ref<{
	open: boolean;
	src: string | null;
	caption: string;
}>({ open: false, src: null, caption: "" });

function onEnlarge(p: { src: string; caption: string }) {
	lightbox.value = {
		open: true,
		src: p.src,
		caption: p.caption,
	};
}

function closeLightbox() {
	lightbox.value = { ...lightbox.value, open: false };
}

// =====================================================================
// Mode transitions: drive UI off URL query params so links work.
// =====================================================================

/** Navigate to ?mode=review (optionally jumping to a step number). */
function startReview(step: number | null = null) {
	const query: Record<string, string> = { mode: "review" };
	if (step) query.step = String(step);
	router.replace({ path: route.path, query });
}

/** Navigate to ?mode=explanation. */
function showExplanation() {
	router.replace({ path: route.path, query: { mode: "explanation" } });
}

/** Pop the user back to ?mode= (no query). */
function returnToQuestion() {
	router.replace({ path: route.path, query: {} });
}

/** Keep ?step= in sync as the user advances inside the step flow. */
function onReviewStepChanged(n: number) {
	if (mode.value !== "review") return;
	if (stepQuery.value === n) return;
	router.replace({
		path: route.path,
		query: { mode: "review", step: String(n) },
	});
}

// =====================================================================
// Question handling
// =====================================================================

function onSelectChoice(letter: string) {
	if (answered.value) return;
	selected.value = letter;
}

const correct = computed(() => {
	if (!station.value || !selected.value) return null;
	return selected.value === station.value.correct;
});

const verdictText = computed(() => {
	if (correct.value === null) return "";
	return correct.value ? "Correct" : "Not quite — let's walk through it";
});

const reviewVerdictText = computed(() => {
	if (correct.value === null) return "";
	return correct.value
		? "Correct — now see the full story"
		: "Not quite — let's walk through it";
});

/** Has the user completed this station previously? */
const alreadyCompleted = computed(() => {
	if (!chapter.value || !station.value) return false;
	return progress.getStatus(chapter.value.num, station.value.idx) === "completed";
});

/** Marks the station completed and routes back to the system map. */
function completeStation() {
	if (!chapter.value || !station.value) return;
	progress.markCompleted(chapter.value.num, station.value.idx);
	router.push(`/game/story/solo/${systemName.value}`);
}

// =====================================================================
// Bank handling
// =====================================================================

function onPickBankChoice(bankIdx: number, letter: string) {
	if (bankRevealed.value[bankIdx]) return;
	bankRevealed.value = { ...bankRevealed.value, [bankIdx]: letter };
}

function bankStatus(bankIdx: number, letter: string, correctLetter: string) {
	const picked = bankRevealed.value[bankIdx];
	if (!picked) return "neutral";
	if (letter === correctLetter) return "correct";
	if (letter === picked) return "wrong";
	return "neutral";
}

// =====================================================================
// Mounted: scroll-restore + auto-jump to mode flows.
// =====================================================================

onMounted(() => {
	nextTick(() => {
		const target = document.scrollingElement || document.documentElement;
		if (target) target.scrollTop = 0;
	});
});

// In explanation mode, reset both column scroll positions to the top so
// the user starts at the verdict instead of wherever they left the
// question column scrolled to.
watch(mode, async (next) => {
	if (next !== "explanation") return;
	await nextTick();
	document
		.querySelectorAll<HTMLElement>("[data-explanation-scroll]")
		.forEach((el) => {
			el.scrollTop = 0;
		});
});
</script>

<template>
	<!--
		Outer wrapper. In question mode, the page is allowed to scroll
		normally. In explanation mode, the wrapper is locked to the
		viewport (`h-screen overflow-hidden`) so each column scrolls
		independently, exactly like the reference HTML's `.card-overlay`.
	-->
	<div
		class="flex flex-col bg-[#0a0e1a] text-[#e8ecf3]"
		:class="
			mode === 'explanation'
				? 'h-screen overflow-hidden'
				: 'min-h-screen'
		"
	>
		<!--
			Top bar — matches the reference HTML's `.card-topbar`: chapter
			crumbs on the left, close button on the right. No verdict here
			(the original keeps the verdict inside the explanation block on
			the right column).
		-->
		<div
			v-if="!pending && system && chapter && station"
			class="z-20 flex flex-none items-center justify-between border-b border-[#222c3e] bg-[#0a0e1a] px-6 py-4 md:px-8"
		>
			<div
				class="flex items-center gap-3 font-jetbrains text-[11px] tracking-[0.3em] uppercase text-[#e8a951]"
			>
				<NuxtLink
					:to="`/game/story/solo/${systemName}`"
					class="text-[#6b7689] hover:text-[#e8a951]"
					>← Map</NuxtLink
				>
				<span class="text-[#6b7689]">/</span>
				<span>Chapter {{ String(chapter.num).padStart(2, "0") }}</span>
				<span class="text-[#6b7689]">/</span>
				<span class="text-[#b4becf]">{{ station.label }}</span>
			</div>
			<NuxtLink
				:to="`/game/story/solo/${systemName}`"
				class="flex h-10 w-10 items-center justify-center rounded-full border border-[#222c3e] text-[18px] text-[#b4becf] transition-all duration-200 hover:rotate-90 hover:border-[#6b7689] hover:bg-[#111826] hover:text-[#e8ecf3]"
				title="Close"
				>✕</NuxtLink
			>
		</div>

		<!-- Loading -->
		<StoryLoader
			v-if="pending"
			label="Loading station"
			class="flex-1"
		/>

		<!-- 404 -->
		<div
			v-else-if="!system || !chapter || !station"
			class="p-12 text-center text-[#6b7689]"
		>
			This station could not be found.
			<NuxtLink
				:to="`/game/story/solo/${systemName}`"
				class="text-[#e8a951] underline"
			>
				Back to map
			</NuxtLink>
		</div>

		<template v-else>
			<!-- =================================================================
					Mode: REVIEW (step-flow walkthrough)
					Renders the StoryStepFlow as a fixed full-viewport overlay.
				================================================================= -->
			<StoryStepFlow
				v-if="mode === 'review' && station.stepFlow"
				:chapter-num="chapter.num"
				:station="station"
				:initial-step="stepQuery"
				@close="returnToQuestion"
				@complete="showExplanation"
				@step-changed="onReviewStepChanged"
			/>

			<!-- =================================================================
					Mode: QUESTION (default) and EXPLANATION
					Question mode = single column, page scrolls naturally.
					Explanation mode = two columns inside a height-locked
					viewport; each column scrolls independently.
				================================================================= -->
			<div
				v-else
				class="mx-auto flex w-full max-w-[1320px] flex-1"
				:class="mode === 'explanation' ? 'min-h-0 overflow-hidden' : 'flex-col'"
			>
				<div
					class="grid w-full min-h-0 flex-1 transition-[grid-template-columns] duration-500"
					:class="
						mode === 'explanation'
							? 'grid-cols-1 lg:grid-cols-2 h-full overflow-hidden'
							: 'grid-cols-1'
					"
				>
					<!-- Left column: the question block. In explanation mode
					     this column owns its own scroll area. -->
					<div
						class="flex flex-col items-center px-6 py-8 md:px-15 lg:py-7"
						:class="
							mode === 'explanation'
								? 'story-explanation-scroll min-h-0 overflow-y-auto border-r-0 lg:border-r lg:border-[#222c3e] lg:items-stretch lg:px-10 lg:pt-7 lg:pb-15'
								: ''
						"
						:data-explanation-scroll="mode === 'explanation' ? 'left' : null"
					>
						<div
							class="w-full max-w-[760px]"
							:class="mode === 'explanation' ? 'lg:max-w-none' : ''"
						>
							<StoryQuestionCard
								:bridge="station.bridge"
								:vignette="station.vignette"
								:stem="station.stem"
								:choices="station.choices"
								:correct="station.correct"
								:selected="selected"
								:revealed="answered"
								:compact="mode === 'question'"
								@select="onSelectChoice"
							/>

							<!--
								Review-the-concept CTA. Lives in the LEFT column under
								the choices, exactly like the original `.review-cta` in
								the reference HTML. Visible in BOTH question mode (so
								the user can launch the walkthrough after answering)
								AND explanation mode (so they can revisit it after
								reading the explanation) — matches the original where
								the `answered-needs-review` class is added on answer
								and never removed.
							-->
							<div
								v-if="
									answered &&
									station.stepFlow &&
									station.stepFlow.flow.length > 0
								"
								class="mt-7"
							>
								<div
									class="mb-3.5 rounded-[3px] border px-3.5 py-2 text-center font-jetbrains text-[11px] tracking-[0.25em] uppercase font-bold"
									:class="
										correct
											? 'border-[rgba(79,184,168,0.25)] bg-[rgba(79,184,168,0.08)] text-[#4fb8a8]'
											: 'border-[rgba(209,72,89,0.25)] bg-[rgba(209,72,89,0.08)] text-[#d14859]'
									"
								>
									{{ reviewVerdictText }}
								</div>
								<button
									class="relative flex w-full cursor-pointer flex-col items-center gap-1.5 overflow-hidden rounded-md border-[1.5px] border-[#e8a951] bg-[linear-gradient(135deg,rgba(232,169,81,0.16)_0%,rgba(232,169,81,0.08)_100%)] px-7 py-5 text-[#e8ecf3] transition-all duration-200 hover:-translate-y-px hover:border-[#ffc674] hover:[box-shadow:0_8px_24px_rgba(232,169,81,0.2)]"
									@click="startReview(null)"
								>
									<span class="font-fraunces text-xl font-semibold text-[#e8a951]">
										Review the concept
									</span>
									<span
										class="font-jetbrains text-[10px] tracking-[0.2em] uppercase text-[#6b7689]"
									>
										Walk through it step by step →
									</span>
								</button>

								<!-- Skip review and go straight to explanation. Hidden
								     once we are already in explanation mode. -->
								<button
									v-if="mode === 'question'"
									class="mt-2 w-full cursor-pointer text-center font-jetbrains text-[10px] tracking-[0.2em] uppercase text-[#6b7689] transition-colors duration-200 hover:text-[#b4becf]"
									@click="showExplanation"
								>
									Skip review · See explanation
								</button>
							</div>

							<!-- Fallback for stations with no stepFlow: jump straight to
							     the explanation when answered. -->
							<div
								v-else-if="answered && mode === 'question'"
								class="mt-7 flex justify-end"
							>
								<button
									class="flex cursor-pointer items-center gap-2.5 rounded-[3px] border border-[#e8a951] bg-[#e8a951] px-5 py-3 font-jetbrains text-[11px] font-semibold tracking-[0.15em] uppercase text-[#0a0e1a] transition-all duration-200 hover:translate-x-1 hover:bg-[#c08537] hover:[box-shadow:0_4px_20px_rgba(232,169,81,0.35)]"
									@click="showExplanation"
								>
									See explanation →
								</button>
							</div>
						</div>
					</div>

					<!-- Right column: previously / stage / story / explanation.
					     Independently scrollable so the user can read this column
					     without losing their place in the question column. The
					     Review-the-concept CTA lives in the LEFT column (under
					     choices) just like the original reference HTML — keeping
					     it duplicated here would be redundant. -->
					<div
						v-if="mode === 'explanation'"
						data-explanation-scroll="right"
						class="story-explanation-scroll min-h-0 overflow-y-auto px-6 py-8 md:px-10 lg:py-15"
					>
						<!-- Previously card -->
						<div
							v-if="station.previously"
							class="mb-6 flex items-start gap-3.5 rounded-r-[3px] border-l-[3px] border-[#4fb8a8] bg-[rgba(79,184,168,0.06)] px-5 py-4"
						>
							<div
								class="min-w-[80px] flex-none pt-1 font-mono text-[10px] font-semibold tracking-[0.3em] uppercase text-[#4fb8a8]"
							>
								Previously
							</div>
							<div
								class="font-fraunces text-base italic font-normal leading-[1.55] text-[#b4becf] [&_em]:italic [&_em]:text-[#4fb8a8]"
								v-html="station.previously"
							/>
						</div>

						<!-- Stage / card title / tagline -->
						<div class="mb-7">
							<div
								class="mb-3.5 font-mono text-[11px] tracking-[0.35em] uppercase text-[#d14859]"
							>
								{{ station.stage }}
							</div>
							<h2
								class="m-0 mb-3.5 font-fraunces text-[clamp(26px,2.8vw,36px)] font-light leading-[1.1] tracking-[-0.02em] text-[#e8ecf3] [&_em]:italic [&_em]:font-normal [&_em]:text-[#e8a951]"
								v-html="station.cardTitle || station.title"
							/>
							<p
								class="m-0 font-fraunces text-[17px] italic leading-[1.45] text-[#b4becf]"
							>
								{{ station.tagline }}
							</p>
						</div>

						<!-- Verdict + explanation -->
						<div class="border-t border-[#222c3e] pt-6">
							<div
								class="mb-2 font-mono text-[11px] tracking-[0.3em] uppercase font-semibold"
								:class="correct ? 'text-[#6cc27d]' : 'text-[#d14859]'"
							>
								{{ verdictText }}
							</div>
							<h3
								class="m-0 mb-4.5 font-fraunces text-2xl font-normal leading-[1.25] text-[#e8ecf3] [&_em]:italic [&_em]:text-[#e8a951]"
								v-html="station.explanationTitle || ''"
							/>
							<StoryRichText
								class="mb-6"
								:html="station.explanation"
								:diagrams="station.explanationDiagrams"
								@enlarge="onEnlarge"
							/>
						</div>

						<!-- Story prose -->
						<div v-if="station.story" class="mt-7 border-t border-[#222c3e] pt-7">
							<div
								class="mb-3.5 font-mono text-[11px] tracking-[0.3em] uppercase font-semibold text-[#4fb8a8]"
							>
								The story
							</div>
							<StoryRichText
								:html="station.story"
								:diagrams="station.diagrams"
								@enlarge="onEnlarge"
							/>
						</div>

						<!-- What's next -->
						<div
							v-if="station.whatsNext"
							class="mt-8 rounded-r-[3px] border-l-[3px] border-[#e8a951] bg-[rgba(232,169,81,0.05)] px-6 py-5"
						>
							<div
								class="mb-2.5 font-mono text-[10px] tracking-[0.3em] uppercase font-semibold text-[#e8a951]"
							>
								What happens next
							</div>
							<div
								class="font-fraunces text-base leading-[1.6] text-[#b4becf] [&_em]:italic [&_em]:text-[#e8a951] [&_strong]:font-semibold [&_strong]:text-[#e8ecf3]"
								v-html="station.whatsNext"
							/>
						</div>

						<!-- Action row -->
						<div
							class="mt-7 flex flex-wrap items-center justify-between gap-3"
						>
							<button
								v-if="station.bank.length > 0"
								class="inline-flex cursor-pointer items-center gap-2.5 rounded-[3px] border border-[#222c3e] bg-transparent px-5 py-3 font-mono text-[11px] font-semibold tracking-[0.15em] uppercase text-[#b4becf] transition-all duration-200 hover:border-[#6b7689] hover:bg-[#1a2334] hover:text-[#e8ecf3] before:text-[18px] before:leading-none before:content-['+']"
								@click="bankOpen = !bankOpen"
							>
								Try more cases ({{ station.bank.length }})
							</button>
							<div v-else />

							<button
								class="inline-flex cursor-pointer items-center gap-2.5 rounded-[3px] border px-5 py-3 font-mono text-[11px] font-semibold tracking-[0.15em] uppercase transition-all duration-200 hover:translate-x-1 after:transition-transform after:duration-200 after:content-['→'] hover:after:translate-x-1"
								:class="
									isLastInChapter
										? 'border-[#d14859] bg-[#d14859] text-[#e8ecf3] hover:border-[#a53343] hover:bg-[#a53343] hover:[box-shadow:0_4px_20px_rgba(209,72,89,0.35)]'
										: 'border-[#e8a951] bg-[#e8a951] text-[#0a0e1a] hover:border-[#c08537] hover:bg-[#c08537] hover:[box-shadow:0_4px_20px_rgba(232,169,81,0.35)]'
								"
								@click="completeStation"
							>
								{{ station.nextBtn || "Continue the journey" }}
							</button>
						</div>

						<!-- Practice bank -->
						<div
							v-if="station.bank.length > 0"
							class="overflow-hidden transition-[max-height] duration-500"
							:class="bankOpen ? 'max-h-[50000px]' : 'max-h-0'"
						>
							<div class="mt-5 flex items-center gap-3.5 border-t border-[#222c3e] pt-7 pb-5">
								<div
									class="font-mono text-[11px] tracking-[0.3em] uppercase font-semibold text-[#4fb8a8]"
								>
									Practice Bank
								</div>
								<div class="h-px flex-1 bg-[linear-gradient(90deg,#4fb8a8_0%,transparent_100%)] opacity-40" />
							</div>
							<p class="mb-6 font-fraunces text-base italic text-[#6b7689]">
								Additional cases that test the same concept in different
								clinical settings. Try as many as you like, then continue.
							</p>
							<div
								v-for="(bq, bi) in station.bank"
								:key="bi"
								class="my-4.5 overflow-hidden rounded-[4px] border border-[#222c3e] bg-[#050811]"
							>
								<div
									class="flex items-center gap-2.5 border-b border-[#222c3e] bg-[#111826] px-5 py-4 font-jetbrains text-[10px] tracking-[0.25em] uppercase text-[#4fb8a8] before:h-2 before:w-2 before:flex-none before:rounded-full before:bg-[#4fb8a8] before:content-['']"
								>
									{{ bq.label }}
								</div>
								<div class="px-6 pt-5 pb-5">
									<div
										class="mb-4.5 border-b border-[#222c3e] pb-4.5 font-fraunces text-[15px] leading-[1.65] text-[#b4becf] [&_p]:m-0 [&_p]:mb-3 [&_p:last-child]:mb-0"
										v-html="bq.vignette"
									/>
									<div
										class="mb-5 font-fraunces text-base font-medium leading-[1.45] text-[#e8ecf3]"
										v-html="bq.stem"
									/>
									<ul class="m-0 list-none p-0">
										<li
											v-for="c in bq.choices"
											:key="c.letter"
											class="my-1.5 flex cursor-pointer items-center gap-4 rounded-[3px] border bg-[#050811] px-4 py-3 font-inter text-sm transition-all duration-200"
											:class="[
												bankStatus(bi, c.letter, bq.correct) === 'correct'
													? 'bg-[rgba(108,194,125,0.08)] border-[rgba(108,194,125,0.4)] text-[#e8ecf3]'
													: bankStatus(bi, c.letter, bq.correct) === 'wrong'
														? 'bg-[rgba(209,72,89,0.08)] border-[rgba(209,72,89,0.35)] text-[#b4becf]'
														: 'border-[#222c3e] text-[#b4becf] hover:bg-[#1a2334] hover:border-[#6b7689] hover:text-[#e8ecf3] hover:translate-x-1',
												bankRevealed[bi] ? 'cursor-default' : '',
											]"
											@click="onPickBankChoice(bi, c.letter)"
										>
											<span
												class="flex h-6 w-6 flex-none items-center justify-center rounded-full border bg-[#0a0e1a] font-mono text-[11px] font-semibold transition-all duration-200"
												:class="
													bankStatus(bi, c.letter, bq.correct) === 'correct'
														? '!bg-[#6cc27d] !border-[#6cc27d] !text-[#0a0e1a]'
														: bankStatus(bi, c.letter, bq.correct) === 'wrong'
															? '!bg-[#d14859] !border-[#d14859] !text-[#e8ecf3]'
															: 'border-[#222c3e] text-[#e8a951]'
												"
											>
												{{ c.letter }}
											</span>
											<span class="flex-1 leading-[1.4]" v-html="c.text" />
										</li>
									</ul>
									<!-- Bank explanation -->
									<div
										class="overflow-hidden transition-[max-height] duration-500"
										:class="bankRevealed[bi] ? 'max-h-[5000px]' : 'max-h-0'"
									>
										<div class="mt-6 border-t border-[#222c3e] pt-6">
											<div
												class="mb-2 font-mono text-[11px] tracking-[0.3em] uppercase font-semibold"
												:class="
													bankRevealed[bi] === bq.correct
														? 'text-[#6cc27d]'
														: 'text-[#d14859]'
												"
											>
												{{
													bankRevealed[bi] === bq.correct
														? "Correct"
														: "Not quite — here's why"
												}}
											</div>
											<h3
												class="m-0 mb-4 font-fraunces text-xl font-normal leading-[1.25] text-[#e8ecf3] [&_em]:italic [&_em]:text-[#e8a951]"
												v-html="bq.explanationTitle || ''"
											/>
											<div
												class="font-fraunces text-[15px] leading-[1.65] text-[#b4becf] [&_p]:m-0 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-[#e8ecf3]"
												v-html="bq.explanation || ''"
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Diagram lightbox -->
			<StoryDiagramLightbox
				:open="lightbox.open"
				:src="lightbox.src"
				:caption="lightbox.caption"
				@close="closeLightbox"
			/>
		</template>
	</div>
</template>

<style scoped>
/*
	Custom scrollbar styling for the explanation-mode columns. Mirrors
	the reference HTML's `.col-left::-webkit-scrollbar` rules: 6px wide,
	transparent track, `--rule` (#222c3e) thumb with 4px radius. Falls
	back to Firefox's `scrollbar-*` properties on non-WebKit browsers.
*/
.story-explanation-scroll {
	scrollbar-width: thin;
	scrollbar-color: #222c3e transparent;
}
.story-explanation-scroll::-webkit-scrollbar {
	width: 6px;
}
.story-explanation-scroll::-webkit-scrollbar-track {
	background: transparent;
}
.story-explanation-scroll::-webkit-scrollbar-thumb {
	background: #222c3e;
	border-radius: 4px;
}
.story-explanation-scroll::-webkit-scrollbar-thumb:hover {
	background: #6b7689;
}
</style>
