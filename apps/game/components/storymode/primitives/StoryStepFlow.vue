<!--
  StoryStepFlow
  =============
  The "Study Mode" tap-through walkthrough. Renders a fixed full-viewport
  overlay with: progress bar, header (crumbs + dots + close), a pinned
  diagram pane that swaps per-step, the step text card the user taps to
  advance, and an aside listing the captured insights.

  Behaviour mirrors the reference implementation:
    - Click anywhere on the step card to advance.
    - Back button steps through "step" entries only (skips transitions).
    - Each step optionally swaps the diagram (per-step or back to main).
    - A "transition" flow item shows the "ready to see it in a patient?"
      handoff screen — the user clicks "Continue to the explanation"
      which closes the overlay and emits `complete`.
    - A 🔊/🔇 toggle in the header drives the Web Speech API: when on,
      the current step's `voice` text is spoken aloud each time the
      step changes. Preference persists in localStorage.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import StoryDiagram from "./StoryDiagram.vue";
import type {
	StoryFlowItem,
	StoryQuiz,
	StoryStation,
	StoryStep,
} from "@/composables/storymode/types";

interface Props {
	chapterNum: number;
	station: StoryStation;
	/**
	 * Optionally start at a specific step number (1-based). Used by the
	 * `?mode=review&step=N` query-param entrypoint.
	 */
	initialStep?: number | null;
}
const props = withDefaults(defineProps<Props>(), { initialStep: null });

const emit = defineEmits<{
	close: [];
	/** Fired when the user finishes the walkthrough and wants the explanation. */
	complete: [];
	/**
	 * Fires whenever the active step number changes so the parent can keep
	 * the URL `?step=` query parameter synced for deep-linking.
	 */
	stepChanged: [step: number];
}>();

const flow = computed<StoryFlowItem[]>(
	() => props.station.stepFlow?.flow ?? [],
);
const stepItems = computed<StoryStep[]>(
	() => flow.value.filter((f): f is StoryStep => f.type === "step"),
);
const totalSteps = computed(() => stepItems.value.length);

/** Where we are in `flow`. -1 = intro screen. */
const currentIndex = ref(-1);

/** Highest step number reached (controls the knowledge-panel reveal). */
const maxStepReached = ref(0);

/**
 * The step the diagram pane is currently pinned to. Distinct from
 * `currentStep` because when the user advances onto a `quiz` / `partner`
 * / `transition` item we want to KEEP the previous step's diagram
 * displayed (matches the original — `sfRenderStep` is the only thing
 * that swaps the diagram, so quiz overlays float over whatever was
 * last pinned). Set whenever `next()` / `prev()` / `goToStep()` lands
 * on a step item.
 */
const stageStep = ref<StoryStep | null>(null);

/** True when we're showing the "ready for the explanation" transition. */
const showTransition = ref(false);

/** Mobile-only knowledge panel toggle. */
const kpOpen = ref(false);

// =====================================================================
// Quick-check quiz overlay state.
// Quiz items are interleaved between steps in `flow`. When `next()`
// advances onto one we open the overlay; the user must answer (any
// answer is allowed — feedback differs) and then click Continue, which
// advances past the quiz to the next step.
// =====================================================================
/** Active quiz item, or null when no quiz is showing. */
const activeQuiz = ref<StoryQuiz | null>(null);
/** Index of the answer the user picked (or null = unanswered). */
const quizPickedIdx = ref<number | null>(null);

const quizFeedback = computed(() => {
	if (!activeQuiz.value || quizPickedIdx.value === null) return "";
	const picked = activeQuiz.value.choices[quizPickedIdx.value];
	if (!picked) return "";
	return picked.correct
		? activeQuiz.value.feedback?.correct || ""
		: activeQuiz.value.feedback?.wrong || "";
});

function pickQuizChoice(idx: number) {
	if (quizPickedIdx.value !== null) return;
	quizPickedIdx.value = idx;
	stopVoice();
}

function closeQuiz() {
	activeQuiz.value = null;
	quizPickedIdx.value = null;
	next();
}

// =====================================================================
// Voice / TTS — Web Speech API. Mirrors the reference implementation.
// =====================================================================
const VOICE_STORAGE_KEY = "storymode.voice.enabled.v1";

/**
 * Whether the TTS toggle is currently enabled. Hydrated from
 * localStorage so the user's preference survives reloads.
 */
const voiceEnabled = ref(true);
if (typeof window !== "undefined") {
	const stored = window.localStorage.getItem(VOICE_STORAGE_KEY);
	if (stored !== null) voiceEnabled.value = stored === "1";
}

/** True when this browser exposes the Web Speech API. */
const voiceSupported = computed(
	() => typeof window !== "undefined" && "speechSynthesis" in window,
);

function stopVoice() {
	if (typeof window === "undefined") return;
	if (window.speechSynthesis) window.speechSynthesis.cancel();
}

/**
 * Pick a "natural"-sounding English voice when one is available, falling
 * back to any English voice if not. Matches the reference HTML's choice.
 */
function pickPreferredVoice(): SpeechSynthesisVoice | null {
	if (!voiceSupported.value) return null;
	const voices = window.speechSynthesis.getVoices();
	return (
		voices.find((v) => /samantha|victoria|karen|natural/i.test(v.name)) ||
		voices.find(
			(v) =>
				v.lang &&
				v.lang.startsWith("en") &&
				v.name.toLowerCase().includes("female"),
		) ||
		voices.find((v) => v.lang && v.lang.startsWith("en")) ||
		null
	);
}

function speak(text: string | undefined | null) {
	if (!voiceEnabled.value || !text || !voiceSupported.value) return;
	stopVoice();
	const u = new SpeechSynthesisUtterance(text);
	u.rate = 1.0;
	u.pitch = 1.0;
	u.volume = 0.9;
	const preferred = pickPreferredVoice();
	if (preferred) u.voice = preferred;
	window.speechSynthesis.speak(u);
}

/**
 * Build the TTS narration for a given step at runtime: strip HTML from
 * `text` (and `subtext` if present) and join the two with a sentence
 * boundary. The JSON deliberately doesn't carry a separate `voice`
 * field — duplicating the prose just creates two sources of truth.
 */
function narrationFor(step: StoryStep | null | undefined): string {
	if (!step) return "";
	const stripHtml = (s: string) =>
		s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
	const parts = [stripHtml(step.text)];
	if (step.subtext) parts.push(stripHtml(step.subtext));
	return parts.filter(Boolean).join(" ");
}

function toggleVoice() {
	voiceEnabled.value = !voiceEnabled.value;
	if (typeof window !== "undefined") {
		window.localStorage.setItem(VOICE_STORAGE_KEY, voiceEnabled.value ? "1" : "0");
	}
	if (!voiceEnabled.value) stopVoice();
	else speak(narrationFor(currentStep.value));
}

const currentItem = computed<StoryFlowItem | null>(
	() => flow.value[currentIndex.value] ?? null,
);

const currentStep = computed<StoryStep | null>(() => {
	const item = currentItem.value;
	return item && item.type === "step" ? item : null;
});

const currentStepNumber = computed(() => currentStep.value?.n ?? null);

/**
 * Step number used to drive the top progress bar + dots. Derived from
 * `stageStep` (the most recently rendered step) so the indicator stays
 * frozen on the previous step's value while the user is on a quiz /
 * partner / transition item — matching the reference HTML, where
 * `sfUpdateProgressBar` and `sfRenderDots` were only called from
 * `sfRenderStep` and therefore left the DOM untouched on overlays.
 */
const displayedStepNumber = computed(() => stageStep.value?.n ?? null);

const progressPct = computed(() => {
	if (!displayedStepNumber.value || totalSteps.value === 0) return 0;
	return (displayedStepNumber.value / totalSteps.value) * 100;
});

/** Find the previous "step" item (skipping transitions). */
function findPrevStepIndex(from = currentIndex.value): number {
	for (let i = from - 1; i >= 0; i--) {
		if (flow.value[i]?.type === "step") return i;
	}
	return -1;
}

const canGoBack = computed(() => findPrevStepIndex() !== -1);

function start() {
	currentIndex.value = -1;
	maxStepReached.value = 0;
	showTransition.value = false;
	activeQuiz.value = null;
	quizPickedIdx.value = null;
	stageStep.value = null;
	next();
}

/**
 * Advance to the next flow item. Mirrors the reference's
 * `sfHandleCurrent`:
 *   - `step`     → render normally, speak voice line.
 *   - `partner`  → skip silently (the original disabled this overlay).
 *   - `quiz`     → open the Quick-check overlay; user dismisses it,
 *                  which calls `closeQuiz` → advance again.
 *   - `transition` → show the "Ready for the patient?" handoff.
 */
function next() {
	if (showTransition.value) return;
	if (activeQuiz.value) return; // quiz consumes navigation until dismissed
	const nextIdx = currentIndex.value + 1;
	if (nextIdx >= flow.value.length) return;
	currentIndex.value = nextIdx;
	const item = flow.value[currentIndex.value];
	if (!item) return;
	if (item.type === "partner") {
		next();
		return;
	}
	if (item.type === "quiz") {
		activeQuiz.value = item;
		quizPickedIdx.value = null;
		stopVoice();
		return;
	}
	if (item.type === "transition") {
		showTransition.value = true;
		stopVoice();
		return;
	}
	if (item.type === "step") {
		if (item.n > maxStepReached.value) maxStepReached.value = item.n;
		stageStep.value = item;
		emit("stepChanged", item.n);
		speak(narrationFor(item));
	}
}

function prev() {
	if (activeQuiz.value) return; // quiz blocks back-navigation, like original
	if (showTransition.value) {
		showTransition.value = false;
		return;
	}
	const prevIdx = findPrevStepIndex();
	if (prevIdx === -1) return;
	currentIndex.value = prevIdx;
	const item = flow.value[currentIndex.value];
	if (item && item.type === "step") {
		stageStep.value = item;
		emit("stepChanged", item.n);
		speak(narrationFor(item));
	}
}

function goToStep(n: number) {
	const idx = flow.value.findIndex(
		(f) => f.type === "step" && f.n === n,
	);
	if (idx === -1) return;
	currentIndex.value = idx;
	maxStepReached.value = Math.max(maxStepReached.value, n);
	showTransition.value = false;
	emit("stepChanged", n);
	const item = flow.value[idx];
	if (item && item.type === "step") {
		stageStep.value = item;
		speak(narrationFor(item));
	}
}

function close() {
	stopVoice();
	emit("close");
}

function complete() {
	stopVoice();
	emit("complete");
}

/**
 * Diagram currently pinned in the stage. Reads from `stageStep`, NOT
 * `currentStep`, so the diagram from the most recently rendered step
 * stays visible while quiz / partner / transition overlays are open.
 *
 * The extraction script guarantees every step has a `stepDiagram` —
 * either authored as inline SVG, referenced by id, or auto-filled from
 * the station's main diagram for spotlight-only steps. So we just read
 * it directly with no fallback.
 */
const stageDiagram = computed(() => {
	const sd = stageStep.value?.stepDiagram;
	return sd ? { src: sd.src } : null;
});

/**
 * Spotlight position for the pinned step. The extraction script now
 * fills `stepDiagram` for every step (falling back to the station's
 * main diagram when the source authored only a spotlight), so we drive
 * the overlay purely off the `spotlight` field — present means paint
 * it, absent means don't.
 */
const spotlight = computed(
	() => stageStep.value?.spotlight ?? null,
);

const stageWrap = ref<HTMLElement | null>(null);
const spotlightStyle = computed(() => {
	if (!spotlight.value || !stageWrap.value) return { opacity: "0" };
	const w = stageWrap.value.clientWidth;
	const h = stageWrap.value.clientHeight;
	const sp = spotlight.value;
	const size = Math.min(w, h) * (sp.r / 100) * 2.5;
	return {
		width: `${size}px`,
		height: `${size}px`,
		left: `${(sp.x / 100) * w}px`,
		top: `${(sp.y / 100) * h}px`,
		opacity: "1",
	};
});

// Auto-start the walkthrough on mount. If a `?step=N` deep link was
// passed, jump straight to that step; otherwise drop the user on step 1.
onMounted(() => {
	if (props.initialStep && props.initialStep >= 1) {
		goToStep(props.initialStep);
	} else {
		start();
	}
	window.addEventListener("keydown", handleKey);
});
onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleKey);
	stopVoice();
});

function handleKey(e: KeyboardEvent) {
	if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
		e.preventDefault();
		next();
	} else if (e.key === "ArrowLeft" || e.key === "Backspace") {
		e.preventDefault();
		prev();
	} else if (e.key === "Escape") {
		e.preventDefault();
		close();
	}
}

watch(
	() => props.initialStep,
	(n) => {
		if (n && n >= 1) {
			goToStep(n);
		}
	},
);
</script>

<template>
	<div class="fixed inset-0 z-[10000] flex flex-col bg-background select-none">
		<!-- Top progress bar -->
		<div class="relative h-[3px] flex-none overflow-hidden bg-muted">
			<div
				class="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#b87b24,#e8a951_50%,#f4c97e)] [box-shadow:0_0_10px_rgba(232,169,81,0.5)] transition-[width] duration-500"
				:style="{ width: `${progressPct}%` }"
			/>
		</div>

		<!--
			The reference HTML's intro screen (hook + estimate + "Begin"
			button) was removed at the user's request. The walkthrough now
			drops the user straight on step 1 — onMounted calls start().
		-->

		<!-- Header -->
		<header
			class="flex flex-none items-center gap-3.5 border-b border-border bg-background px-5 py-3 font-inter"
		>
			<div class="flex-none text-[10px] font-medium uppercase tracking-[2px] text-muted-foreground">
				CH <strong class="font-bold text-[#e8a951]">{{ String(chapterNum).padStart(2, "0") }}</strong>
				· {{ station.label.replace("Station ", "S") }}
			</div>
			<!--
				Progress dots. Bound to `displayedStepNumber` so they freeze
				on the previous step's value when the user is on a quiz /
				partner / transition overlay (matches the original — the
				DOM only updated from sfRenderStep).
			-->
			<div class="flex flex-1 items-center justify-center gap-1.5">
				<span
					v-for="step in stepItems"
					:key="step.n"
					class="h-[7px] w-[7px] rounded-full transition-all duration-300"
					:class="
						displayedStepNumber !== null && step.n === displayedStepNumber
							? 'bg-[#e8a951] scale-[1.4] [box-shadow:0_0_8px_rgba(232,169,81,0.6)]'
							: displayedStepNumber !== null && step.n < displayedStepNumber
								? 'bg-[#e8a951] opacity-55'
								: 'bg-muted'
					"
				/>
			</div>
			<div class="flex flex-none items-center gap-1.5">
				<button
					class="flex h-[30px] w-auto cursor-pointer items-center gap-1.5 rounded-md border border-[#e8a951] bg-card px-3 text-[11px] font-bold tracking-[0.5px] text-[#e8a951] sm:hidden"
					@click="kpOpen = !kpOpen"
				>
					📋 <span>{{ maxStepReached }}</span>
				</button>
				<!--
					TTS toggle. When the browser exposes the Web Speech API,
					this drives narration of each step's `voice` line. Active
					state shows the orange "speaker on" treatment from the
					reference HTML; muted shows a neutral icon.
				-->
				<button
					v-if="voiceSupported"
					class="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md border text-[13px] transition-all duration-200"
					:class="
						voiceEnabled
							? 'border-[#e8a951] bg-[#e8a951] text-[#0a0e1a] hover:bg-[#c08537] hover:border-[#c08537]'
							: 'border-border bg-card text-muted-foreground hover:border-muted-foreground hover:bg-secondary hover:text-foreground'
					"
					:title="voiceEnabled ? 'Mute narration' : 'Unmute narration'"
					:aria-pressed="voiceEnabled"
					@click="toggleVoice"
				>
					{{ voiceEnabled ? "🔊" : "🔇" }}
				</button>
				<button
					class="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md border border-border bg-card text-[13px] text-muted-foreground transition-all duration-200 hover:border-muted-foreground hover:bg-secondary hover:text-foreground"
					title="Restart"
					@click="start"
				>
					↻
				</button>
				<button
					class="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md border border-border bg-card text-[13px] text-muted-foreground transition-all duration-200 hover:border-muted-foreground hover:bg-secondary hover:text-foreground"
					title="Close"
					@click="close"
				>
					✕
				</button>
			</div>
		</header>

		<!-- Body -->
		<div class="flex min-h-0 flex-1 overflow-hidden">
			<main class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
				<!--
					Diagram pane. Renders the step's own `stepDiagram` when
					present; otherwise falls back to the station's main
					diagram with a spotlight overlay highlighting the
					step's region — matches the reference HTML's
					`sfRenderStep`.
				-->
				<div
					v-if="stageDiagram"
					ref="stageWrap"
					class="relative flex h-[42%] min-h-[240px] flex-none items-center justify-center overflow-hidden border-b border-border bg-background p-2.5"
				>
					<StoryDiagram :src="stageDiagram.src" mode="stage" />
					<!--
						Spotlight overlay. Only paints when the active step has a
						`spotlight` defined AND we're falling back to the main
						diagram (steps with their own stepDiagram skip it).
					-->
					<div
						v-if="spotlight"
						class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(232,169,81,0.3)_0%,rgba(232,169,81,0.12)_40%,transparent_70%)] transition-all duration-500"
						:style="spotlightStyle"
					/>
				</div>

				<!-- Step zone -->
				<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
					<!-- Tap-through step card -->
					<div
						class="relative flex flex-1 cursor-pointer flex-col items-center justify-center overflow-y-auto px-7 pt-6 pb-4 text-foreground transition-colors duration-200 hover:bg-white/[0.02]"
						@click="next"
					>
						<div
							v-if="currentStep && !showTransition"
							class="w-full max-w-[640px] text-center [animation:storyFadeUp_0.5s_cubic-bezier(0.25,0.1,0.25,1)]"
						>
							<div
								class="mb-[18px] font-mono text-[11px] font-medium tracking-[3px] text-[#e8a951]"
							>
								STEP {{ String(currentStep.n).padStart(2, "0") }} /
								{{ String(totalSteps).padStart(2, "0") }}
							</div>
							<div
								class="mb-3 font-fraunces text-[clamp(22px,4vw,30px)] font-normal leading-[1.3] text-foreground [&_strong]:font-semibold [&_strong]:text-[#e8a951] [&_em]:not-italic [&_em]:text-[#e8a951]"
								v-html="currentStep.text"
							/>
							<!--
								Subtext can contain inline markup (<strong>, <em>) so
								it must render via v-html. The selectors apply the
								same orange-accent style the rest of the step text
								uses for emphasised words.
							-->
							<div
								v-if="currentStep.subtext"
								class="text-[clamp(14px,2.3vw,16px)] italic leading-[1.55] text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_em]:text-[#e8a951]"
								v-html="currentStep.subtext"
							/>
						</div>
					</div>

					<!--
						Quiz overlay — the "Quick check" the original HTML
						interleaves between steps. Mirrors `.sf-quiz-overlay`:
						eyebrow + question + choice buttons + feedback line +
						a Continue button that only appears after answering.
					-->
					<div
						v-if="activeQuiz"
						class="absolute inset-0 z-[15] flex flex-col items-center justify-center bg-[rgba(10,14,26,0.97)] p-8 text-center backdrop-blur-md [animation:storyFadeIn_0.3s_ease]"
					>
						<div
							class="mb-3.5 flex items-center gap-2 text-[10px] font-semibold tracking-[3px] uppercase text-[#e8a951]"
						>
							⚡ Quick check
						</div>
						<p
							class="mb-6 max-w-[560px] font-fraunces text-[clamp(20px,3.8vw,26px)] leading-[1.35] text-foreground"
						>
							{{ activeQuiz.question }}
						</p>
						<div class="flex max-w-[520px] flex-wrap justify-center gap-3">
							<button
								v-for="(c, i) in activeQuiz.choices"
								:key="i"
								type="button"
								class="flex w-full max-w-[380px] cursor-pointer items-center gap-3 rounded-lg border bg-card px-5 py-3 text-left font-inter text-[14px] font-semibold transition-all duration-200 disabled:cursor-not-allowed"
								:class="[
									quizPickedIdx === null
										? 'border-border text-foreground hover:-translate-y-px hover:border-[#e8a951] hover:bg-secondary'
										: c.correct
											? 'border-[#4fb8a8] bg-[rgba(79,184,168,0.15)] text-[#4fb8a8]'
											: i === quizPickedIdx
												? 'border-[#d14859] bg-[rgba(209,72,89,0.1)] text-[#d14859]'
												: 'border-border text-foreground',
								]"
								:disabled="quizPickedIdx !== null"
								@click="pickQuizChoice(i)"
							>
								<span
									class="rounded-[4px] bg-background px-2 py-1 font-jetbrains text-[11px] font-bold text-[#e8a951]"
								>
									{{ String.fromCharCode(65 + i) }}
								</span>
								<span class="flex-1">{{ c.text }}</span>
							</button>
						</div>
						<p
							class="mt-4 min-h-9 max-w-[500px] text-[14px] italic text-muted-foreground"
						>
							{{ quizFeedback }}
						</p>
						<button
							v-if="quizPickedIdx !== null"
							type="button"
							class="mt-5 cursor-pointer border-0 bg-transparent font-jetbrains text-[13px] font-semibold tracking-[2px] uppercase text-[#e8a951] [animation:storyFadeIn_0.3s_ease] hover:text-[#ffc674]"
							@click="closeQuiz"
						>
							Continue →
						</button>
					</div>

					<!-- Transition overlay -->
					<div
						v-if="showTransition"
						class="absolute inset-0 z-[10] flex flex-col items-center justify-center bg-background p-8 text-center [animation:storyFadeIn_0.3s_ease]"
					>
						<div class="mb-3.5 text-[10px] font-semibold tracking-[3px] uppercase text-[#4fb8a8]">
							You've got the mechanism
						</div>
						<h1
							class="m-0 mb-[18px] max-w-[700px] font-fraunces text-[clamp(32px,6vw,48px)] font-normal leading-[1.15] text-foreground"
						>
							Ready to see it in <em class="italic text-[#e8a951]">a patient</em>?
						</h1>
						<p class="mb-7 max-w-[560px] text-[clamp(16px,2.8vw,19px)] italic font-normal leading-[1.5] text-muted-foreground">
							That's the full picture. Now see the key prose and the explanation for
							the question you answered.
						</p>
						<button
							class="cursor-pointer rounded-lg border-0 bg-[#e8a951] px-9 py-[15px] text-[14px] font-bold tracking-[1.5px] uppercase text-[#0a0e1a] transition-all duration-200 hover:-translate-y-0.5 hover:[box-shadow:0_8px_20px_rgba(232,169,81,0.3)]"
							@click="complete"
						>
							Continue to the explanation →
						</button>
					</div>

					<!-- Footer -->
					<div
						class="flex flex-none items-center justify-between border-t border-border bg-background px-5 py-3"
					>
						<button
							class="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-transparent px-3.5 py-1.5 font-inter text-[12px] font-medium tracking-[0.5px] text-muted-foreground transition-all duration-200 hover:border-[#e8a951] hover:text-[#e8a951] disabled:cursor-not-allowed disabled:opacity-25"
							:disabled="!canGoBack || showTransition"
							@click="prev"
						>
							<span>←</span><span>Back</span>
						</button>
						<div class="flex items-center gap-2 text-[11px] uppercase tracking-[2px] text-muted-foreground">
							<span>Tap to continue</span>
							<span class="text-[14px] [animation:storyChevPulse_1.8s_ease-in-out_infinite]">→</span>
						</div>
					</div>
				</div>
			</main>

			<!-- Knowledge panel -->
			<aside
				class="flex w-[300px] flex-none flex-col overflow-hidden border-l border-border bg-background max-md:fixed max-md:right-0 max-md:top-0 max-md:bottom-0 max-md:z-[45] max-md:w-[80%] max-md:max-w-[340px] max-md:transition-transform max-md:duration-300 max-md:[box-shadow:-8px_0_24px_rgba(0,0,0,0.4)]"
				:class="{
					'max-md:translate-x-full': !kpOpen,
					'max-md:translate-x-0': kpOpen,
				}"
			>
				<div class="border-b border-border bg-card px-5 py-4">
					<div class="mb-1 text-[10px] font-semibold tracking-[2px] uppercase text-[#e8a951]">
						What you're building
					</div>
					<div class="font-mono text-[12px] tracking-[1px] text-muted-foreground">
						<strong class="font-bold text-foreground">{{ maxStepReached }}</strong>
						/ <span>{{ totalSteps }}</span> captured
					</div>
				</div>
				<div class="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3.5 py-3">
					<div
						v-if="maxStepReached === 0"
						class="px-5 py-5 text-center text-[12px] italic leading-[1.5] text-muted-foreground"
					>
						Each step adds one key insight to your map.
					</div>
					<div
						v-for="step in stepItems.filter((s) => s.n <= maxStepReached)"
						:key="step.n"
						class="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2.5 transition-all duration-300 [animation:storySlideInRight_0.4s_cubic-bezier(0.25,0.1,0.25,1)]"
						:class="
							step.n === displayedStepNumber
								? 'border-[#e8a951] bg-[rgba(232,169,81,0.08)] [box-shadow:0_0_0_1px_rgba(232,169,81,0.2)]'
								: 'border-border'
						"
					>
						<div
							class="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300"
							:class="
								step.n === displayedStepNumber
									? 'bg-[#e8a951] text-[#0a0e1a]'
									: step.n < (displayedStepNumber ?? 0)
										? 'bg-[#4fb8a8] text-[#0a0e1a]'
										: 'bg-muted text-muted-foreground'
							"
						>
							{{ step.n === displayedStepNumber ? step.n : "✓" }}
						</div>
						<div
							class="text-[13px] leading-[1.4] transition-colors duration-300"
							:class="
								step.n === displayedStepNumber
									? 'text-foreground font-medium'
									: 'text-muted-foreground'
							"
						>
							{{ step.insight || "" }}
						</div>
					</div>
				</div>
				<div
					class="flex justify-between border-t border-border bg-card px-5 py-3 text-[10px] uppercase tracking-[1px] text-muted-foreground"
				>
					<span>Knowledge map</span>
					<span
						class="font-bold text-[#4fb8a8] transition-opacity duration-400"
						:class="maxStepReached === totalSteps ? 'opacity-100' : 'opacity-0'"
						>✓ All captured</span
					>
				</div>
			</aside>
		</div>
	</div>
</template>

<style scoped>
@keyframes storyFadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
@keyframes storyFadeUp {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
@keyframes storySlideInRight {
	from {
		opacity: 0;
		transform: translateX(16px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}
@keyframes storyChevPulse {
	0%, 100% {
		opacity: 0.4;
		transform: translateX(0);
	}
	50% {
		opacity: 1;
		transform: translateX(3px);
	}
}
</style>
