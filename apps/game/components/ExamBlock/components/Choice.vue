<script setup lang="ts">
import { sounds } from "~/composables/audio.client";

// import check_circle_icon from "@client/assets/svg/check-circle.svg";
const nthSelectedChoice = defineModel("selection", {
  type: Number,
  required: true,
});
const nthEliminatedChoices = defineModel("elimination", {
  type: Set<number>,
  required: true,
});
const props = defineProps<{
  body: string;
  index: number;
  isCorrect: boolean | undefined;
  canShowExplanation: boolean;
  explanation?: string | null;
  choicesCount: number;
}>();

const isSelected = computed(() => nthSelectedChoice.value === props.index);
const isEliminated = computed(() =>
  nthEliminatedChoices.value.has(props.index)
);
const isExplanationVisible = ref(false);

function handleSelection() {
  sounds.choice_selected.play();
  if (props.canShowExplanation)
    return (isExplanationVisible.value = !isExplanationVisible.value);

  if (isEliminated.value) nthEliminatedChoices.value.delete(props.index);
  if (isSelected.value) nthSelectedChoice.value = -1;
  else nthSelectedChoice.value = props.index;
}

function handleElimination() {
  if (props.canShowExplanation) return;
  sounds.choice_eliminated.play();
  if (isSelected.value) nthSelectedChoice.value = -1;
  if (nthEliminatedChoices.value.has(props.index))
    nthEliminatedChoices.value.delete(props.index);
  else if (nthEliminatedChoices.value.size + 1 < props.choicesCount)
    nthEliminatedChoices.value.add(props.index);
}
function getChoiceClass() {
  if (!props.canShowExplanation && isSelected.value) return "bg-muted";

  if (props.canShowExplanation) {
    if (props.isCorrect) return "bg-green-900 not-dark:text-white "; //  Choice was selected and is correct
    if (isSelected.value) return "bg-red-900 not-dark:text-white "; //  Choice was selected and is incorrect
    if (isExplanationVisible.value)
      // Choice isnot selected or eliminated and is incorrect
      return "border-red-400 border-solid border-[1.2px] ";
  }
}

function getEliminationClass() {
  if (!props.canShowExplanation && isEliminated.value) return "line-through";
  if (props.isCorrect && isEliminated.value)
    return "line-through decoration-red-700 decoration-2";
  if (isEliminated.value)
    return "line-through  decoration-green-700 decoration-2";
}
</script>

<template>
  <li
    @click="handleSelection"
    @contextmenu.prevent="handleElimination"
    class="w-full rounded-xs overflow-hidden cursor-pointer hover:bg-muted text-[0.9rem] hover:scale-[0.99]"
  >
    <button
      :class="getChoiceClass()"
      class="py-3 px-5 flex justify-between items-center gap-3 w-full"
    >
      <p
        :class="getEliminationClass()"
        class="leading-7 hyphens-auto text-left"
      >
        {{ body }}
      </p>

      <!-- <i-svg
				v-if="canShowExplanation && isCorrect"
				:src="check_circle_icon"
				width="25"
				height="25" /> -->
    </button>
    <p
      v-if="canShowExplanation && isExplanationVisible && explanation"
      :class="isCorrect ? 'text-success' : 'text-destructive'"
      class="py-2 px-5"
    >
      {{ explanation }}
    </p>
  </li>
</template>
