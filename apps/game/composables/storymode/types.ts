/**
 * Type definitions for the story-mode JSON contract returned by the
 * `storymode.system` tRPC procedure.
 *
 * These types mirror the shape produced by the extraction script
 * (`scripts/storymode-extraction/extract.mjs`). Adding a new field to the
 * extractor → must also be reflected here.
 */

/** A single multiple-choice option attached to a question. */
export interface StoryChoice {
	/** Letter shown to the user — "A", "B", "C", … */
	letter: string;
	/** The choice text (may contain inline HTML for bold/italics/etc). */
	text: string;
}

/**
 * A diagram reference. The actual SVG file is served from `src` (a URL —
 * relative path under `public/`, or an absolute URL once moved to object
 * storage). `id` is kept for debugging / analytics only; clients render
 * via `src`. The SVG file embeds its own `viewBox` in the root `<svg>`
 * element, which the browser uses when rendering via `<img>` — no need
 * to duplicate it here.
 */
export interface StoryDiagramRef {
	id: string;
	src: string;
	caption?: string;
}

/** Optional spotlight overlay shown on top of the step diagram. */
export interface StorySpotlight {
	x: number;
	y: number;
	r: number;
}

/**
 * A single tap-through "step" entry inside a station's stepFlow.
 *
 * No `voice` field — the TTS narration is derived at runtime from the
 * stripped-HTML `text` (+ `subtext`). No `viewBox` on `stepDiagram` —
 * the SVG file declares its own viewBox.
 */
export interface StoryStep {
	type: "step";
	n: number;
	text: string;
	subtext?: string;
	insight?: string;
	spotlight?: StorySpotlight | null;
	stepDiagram?: { id: string; src: string } | null;
}

/** A non-step transition flow item (e.g. between mechanism and case). */
export interface StoryTransition {
	type: "transition";
	[key: string]: unknown;
}

/** A non-step quiz overlay ("Quick check") shown between steps. */
export interface StoryQuizChoice {
	text: string;
	correct?: boolean;
}
export interface StoryQuiz {
	type: "quiz";
	question: string;
	choices: StoryQuizChoice[];
	feedback?: { correct?: string; wrong?: string };
}

/** A non-step partner-check overlay (rare). */
export interface StoryPartner {
	type: "partner";
	[key: string]: unknown;
}

export type StoryFlowItem =
	| StoryStep
	| StoryTransition
	| StoryQuiz
	| StoryPartner;

/**
 * Optional "study mode" walkthrough attached to a station. Only the
 * flow array survives — the original reference HTML had hook/estimate
 * fields driving an intro screen, but that screen was removed and the
 * fields are no longer emitted by the extraction script.
 */
export interface StoryStepFlow {
	flow: StoryFlowItem[];
}

/** A "practice bank" extra question shown after the main one is answered. */
export interface StoryBankQuestion {
	label: string;
	vignette: string;
	stem: string;
	choices: StoryChoice[];
	correct: string;
	explanationTitle?: string;
	explanation?: string;
}

export interface StoryStation {
	idx: number;
	slug: string;
	label: string;
	title: string;
	subtitle: string | null;
	stage: string | null;
	previously: string | null;
	cardTitle: string | null;
	tagline: string | null;
	story: string;
	diagrams: StoryDiagramRef[];
	explanationDiagrams: StoryDiagramRef[];
	stepFlow: StoryStepFlow | null;
	bridge: string | null;
	vignette: string | null;
	stem: string;
	choices: StoryChoice[];
	correct: string;
	explanationTitle: string | null;
	explanation: string;
	whatsNext: string | null;
	nextBtn: string | null;
	bank: StoryBankQuestion[];
}

export interface StoryChapter {
	num: number;
	slug: string;
	title: string;
	subtitle: string | null;
	mapHint: string | null;
	color: string | null;
	/**
	 * Public URL of this chapter's hero illustration. Same swap-the-URL
	 * convention as `StoryDiagramRef.src` — point it at object storage
	 * later by editing the JSON.
	 */
	heroSrc: string | null;
	stations: StoryStation[];
}

export interface StorySystem {
	name: string;
	displayName: string;
	title: string;
	chapters: StoryChapter[];
}

/** Lightweight entry shown on the systems-picker page. */
export interface StorySystemEntry {
	name: string;
	displayName: string;
	title: string;
	chapterCount: number;
	stationCount: number;
}

/** Status of an individual station in the user's progress. */
export type StationStatus = "completed" | "available" | "locked";
