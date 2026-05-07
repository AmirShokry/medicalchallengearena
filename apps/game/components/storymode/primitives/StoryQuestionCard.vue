<!--
  StoryQuestionCard
  =================
  Renders the multiple-choice question portion of a station: the bridge
  prose, vignette, stem, and choice list. Handles selection and
  correct/wrong feedback styling. The parent decides what comes next
  (review / explanation / completion).

  Layout & sizing match the "QUESTION LAYOUT — split: question left,
  choices right" section of `MCA adaptive immunity story.html` (the
  override CSS at lines 2813–2922):

    - compact + ≥1024px: 2-column grid (1fr 1fr, column-gap 60px).
      Bridge / vignette / stem stack in column 1; the choices list
      occupies column 2 spanning all three rows, vertically centred.
    - compact + <1024px: single column with mobile sizing
      (15px bridge, 16px vignette, 18px stem, 15px choices) — exactly
      the source's `@media (max-width: 900px)` block.
    - revealed: single 760px column with smaller font-sizes, mirroring
      `.card-columns.revealed` overrides in the source.
-->
<script setup lang="ts">
import type { StoryChoice } from "@/composables/storymode/types";

interface Props {
	bridge: string | null;
	vignette: string | null;
	stem: string;
	choices: StoryChoice[];
	correct: string;
	/** The user's currently selected answer letter, or null. */
	selected: string | null;
	/** Whether the answer has been revealed yet. */
	revealed: boolean;
	/**
	 * When true, renders the pre-answer 2-column layout (prose left,
	 * choices right). When false, renders the compact single-column
	 * variant used after the answer reveals the explanation.
	 */
	compact?: boolean;
}
const props = withDefaults(defineProps<Props>(), { compact: true });

const emit = defineEmits<{
	select: [letter: string];
}>();

function statusForChoice(letter: string): "neutral" | "correct" | "wrong" {
	if (!props.revealed) return "neutral";
	if (letter === props.correct) return "correct";
	if (letter === props.selected) return "wrong";
	return "neutral";
}

function onPick(letter: string) {
	if (props.revealed) return;
	emit("select", letter);
}
</script>

<template>
	<!--
		Outer block. In compact + ≥1024px we switch to a 2-col flex row
		(prose stack on the left, choices on the right, vertically
		centred). Otherwise we render a single column capped at 760px
		(revealed look matches the original `.card-columns.revealed`
		overrides).

		Why flex (not grid)? CSS Grid stretches a row to the height of
		the tallest item in it, so spanning `choices` across multiple
		rows of the col-1 stack creates phantom gaps between the prose
		items (and between the stem and the CTA). Flex sidesteps this
		by giving each column its own independent vertical flow.
	-->
	<div
		class="block w-full"
		:class="
			compact
				? 'lg:flex lg:flex-row lg:gap-x-[60px] lg:items-center pt-12'
				: 'max-w-[760px]'
		"
	>
		<!--
			Column-1 wrapper. On mobile (and in revealed mode) this is
			`display: contents`, so its children participate in the outer
			block flow as if the wrapper weren't there — preserving the
			natural mobile DOM order (vignette → stem → choices → CTA).
			At lg+ it becomes a real flex column that holds the prose
			stack alongside the choices column.
		-->
		<div
			:class="
				compact
					? 'contents lg:flex lg:flex-1 lg:flex-col lg:min-w-0'
					: 'contents'
			"
		>
			<!-- Italic bridge prose connecting story → scene -->
			<!-- <div
				v-if="bridge"
				class="relative font-fraunces italic text-muted-foreground border-b border-dashed border-border before:content-[''] before:block before:w-8 before:h-[2px] before:bg-[#e8a951] [&_strong]:text-foreground [&_strong]:font-semibold [&_em]:italic [&_em]:text-[#e8a951]"
				:class="
					compact
						? 'text-[15px] leading-[1.5] mb-[14px] pb-[12px] before:mb-[14px] lg:text-[18px] lg:mb-[22px] lg:pb-[18px] lg:before:mb-[18px]'
						: 'text-[14px] leading-[1.5] mb-[14px] pb-[12px] before:mb-[14px]'
				"
				v-html="bridge"
			/> -->

			<!-- The case description -->
			<div
				v-if="vignette"
				class="font-fraunces leading-[1.65] [&_p]:m-0 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:text-foreground [&_strong]:font-semibold"
				:class="
					compact
						? 'text-[16px] mb-[14px] text-muted-foreground lg:text-[18px] lg:leading-[1.55] lg:mb-[22px] lg:text-foreground'
						: 'text-[15px] mb-[14px] text-muted-foreground'
				"
				v-html="vignette"
			/>

			<!-- Stem -->
			<div
				class="font-fraunces text-foreground [&_em]:italic [&_em]:text-[#e8a951]"
				:class="
					compact
						? 'text-[18px] leading-[1.45] font-medium mb-[18px] lg:text-[22px] lg:leading-[1.35] lg:font-semibold lg:mb-0'
						: 'text-[17px] leading-[1.45] font-medium mb-[16px]'
				"
				v-html="stem"
			/>

			<!--
				Desktop CTA. Sits inside the col-1 flex column, directly
				after the stem with a small `lg:mt-6` gap — matching the
				reference's `.review-cta { margin-top: 24px }`. Hidden on
				mobile (the mobile/revealed CTA below this block renders
				instead so the order remains stem → choices → CTA on
				narrow viewports, just like the original).
			-->
			<div
				v-if="$slots.cta && compact"
				class="hidden lg:block lg:mt-6"
			>
				<slot name="cta" />
			</div>
		</div>

		<!-- Choices -->
		<ul
			class="list-none p-0 flex flex-col"
			:class="
				compact
					? 'gap-[6px] mb-[20px] lg:gap-[12px] lg:mb-0 lg:flex-1 lg:min-w-0'
					: 'gap-[6px] mb-[20px]'
			"
		>
			<li
				v-for="c in choices"
				:key="c.letter"
				class="flex items-center gap-4 font-inter rounded-[3px] border bg-background transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]"
				:class="[
					compact
						? 'text-[15px] leading-[1.4] px-4 py-3 lg:text-[18px] lg:px-[22px] lg:py-[18px]'
						: 'text-[14px] leading-[1.4] px-[14px] py-[9px]',
					revealed ? 'cursor-default' : 'cursor-pointer',
					statusForChoice(c.letter) === 'correct'
						? 'border-[rgba(108,194,125,0.4)] bg-[rgba(108,194,125,0.08)] text-foreground'
						: statusForChoice(c.letter) === 'wrong'
							? 'border-[rgba(209,72,89,0.35)] bg-[rgba(209,72,89,0.08)] text-muted-foreground'
							: revealed
								? 'border-border text-muted-foreground'
								: 'border-border text-muted-foreground hover:bg-secondary hover:border-muted-foreground hover:text-foreground hover:translate-x-1',
				]"
				@click="onPick(c.letter)"
			>
				<span
					class="flex items-center justify-center flex-none rounded-full font-jetbrains font-semibold border bg-background transition-[background-color,border-color,color] duration-200 ease-out"
					:class="[
						compact
							? 'w-[26px] h-[26px] text-[12.5px] lg:w-[34px] lg:h-[34px] lg:text-[15px]'
							: 'w-[26px] h-[26px] text-[12.5px]',
						statusForChoice(c.letter) === 'correct'
							? '!bg-[#6cc27d] !border-[#6cc27d] !text-background'
							: statusForChoice(c.letter) === 'wrong'
								? '!bg-[#d14859] !border-[#d14859] !text-foreground'
								: 'border-border text-[#e8a951]',
					]"
				>
					{{ c.letter }}
				</span>
				<span
					class="flex-1 leading-[1.4]"
					:class="
						compact
							? 'text-[15px] lg:text-[18px]'
							: 'text-[14px]'
					"
					v-html="c.text"
				/>
				<span
					class="text-[17px] font-bold transition-colors duration-200"
					:class="
						statusForChoice(c.letter) === 'correct'
							? 'text-[#6cc27d]'
							: statusForChoice(c.letter) === 'wrong'
								? 'text-[#d14859]'
								: 'text-transparent'
					"
				>
					<template v-if="statusForChoice(c.letter) === 'correct'">✓</template>
					<template v-else-if="statusForChoice(c.letter) === 'wrong'">✕</template>
				</span>
			</li>
		</ul>

		<!--
			Mobile / revealed CTA. Renders after the choices so the natural
			DOM order on narrow viewports matches the reference's mobile
			block (vignette → stem → choices → CTA). Hidden at lg+ in
			compact mode because the desktop CTA above renders instead.
		-->
		<div
			v-if="$slots.cta"
			:class="compact ? 'mt-6 lg:hidden' : 'mt-6'"
		>
			<slot name="cta" />
		</div>
	</div>
</template>
