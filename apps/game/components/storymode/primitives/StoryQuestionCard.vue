<!--
  StoryQuestionCard
  =================
  Renders the multiple-choice question portion of a station: the bridge
  prose, vignette, stem, and choice list. Handles selection and
  correct/wrong feedback styling. The parent decides what comes next
  (review / explanation / completion).
-->
<script setup lang="ts">
import { computed } from "vue";
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
	 * When true, renders the compact "before answer" sizing used when the
	 * question is alone on the page; when false, the post-answer two-column
	 * layout sizing is used.
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

const stemSize = computed(() => (props.compact ? "text-[20px]" : "text-[18px]"));
</script>

<template>
	<div class="w-full max-w-[760px]">
		<!-- Italic bridge prose connecting story → scene -->
		<div
			v-if="bridge"
			class="relative mb-6 border-b border-dashed border-border pb-[22px] font-fraunces italic text-[15px] leading-[1.55] text-muted-foreground before:mb-[18px] before:block before:h-0.5 before:w-8 before:bg-[#e8a951] [&_em]:italic [&_em]:text-[#e8a951] [&_strong]:font-semibold [&_strong]:text-foreground"
			v-html="bridge"
		/>
		<!-- The case description -->
		<div
			v-if="vignette"
			class="mb-[22px] font-fraunces text-[15px] leading-[1.65] text-muted-foreground [&_p]:m-0 [&_p]:mb-3 [&_p:last-child]:mb-0"
			v-html="vignette"
		/>
		<!-- Stem -->
		<div
			class="mb-6 font-fraunces font-medium leading-[1.3] text-foreground"
			:class="stemSize"
			v-html="stem"
		/>
		<!-- Choices -->
		<ul class="m-0 mb-7 list-none p-0">
			<li
				v-for="c in choices"
				:key="c.letter"
				class="my-1.5 flex cursor-pointer items-center gap-4 rounded-[3px] border bg-background px-4 py-2.5 font-inter text-[14.5px] transition-all duration-200"
				:class="[
					statusForChoice(c.letter) === 'correct'
						? 'bg-[rgba(108,194,125,0.08)] border-[rgba(108,194,125,0.4)] text-foreground'
						: statusForChoice(c.letter) === 'wrong'
							? 'bg-[rgba(209,72,89,0.08)] border-[rgba(209,72,89,0.35)] text-muted-foreground'
							: 'border-border text-muted-foreground hover:bg-secondary hover:border-muted-foreground hover:text-foreground hover:translate-x-1',
					revealed ? 'cursor-default' : '',
				]"
				@click="onPick(c.letter)"
			>
				<span
					class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border bg-background font-mono text-[12.5px] font-semibold transition-all duration-200"
					:class="
						statusForChoice(c.letter) === 'correct'
							? '!bg-[#6cc27d] !border-[#6cc27d] !text-background'
							: statusForChoice(c.letter) === 'wrong'
								? '!bg-[#d14859] !border-[#d14859] !text-foreground'
								: 'border-border text-[#e8a951]'
					"
				>
					{{ c.letter }}
				</span>
				<span class="flex-1 leading-[1.4]" v-html="c.text" />
				<span
					class="text-[17px] font-bold transition-all duration-200"
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
	</div>
</template>
