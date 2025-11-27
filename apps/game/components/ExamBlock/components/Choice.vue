<script setup lang="ts">
const audio = useAudioStore();
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
  questionType?: "Default" | "Tabular";
  headerColumns?: number;
}>();

// Parse choice body into columns for tabular display
function parseChoiceColumns(body: string): string[] {
  if (!body) return [];
  // Try splitting by tab first, then by multiple spaces
  const cols = body.includes("\t") ? body.split("\t") : body.split(/\s{2,}/);
  return cols.map((col) => col.trim()).filter((col) => col);
}

const choiceColumns = computed(() => {
  if (props.questionType !== "Tabular") return [];
  return parseChoiceColumns(props.body);
});

const isTabular = computed(
  () => props.questionType === "Tabular" && choiceColumns.value.length > 1
);

const isSelected = computed(() => nthSelectedChoice.value === props.index);
const isEliminated = computed(() =>
  nthEliminatedChoices.value.has(props.index)
);
const isExplanationVisible = ref(false);

function handleSelection() {
  audio.choice_selected.play();
  if (props.canShowExplanation)
    return (isExplanationVisible.value = !isExplanationVisible.value);

  if (isEliminated.value) nthEliminatedChoices.value.delete(props.index);
  if (isSelected.value) nthSelectedChoice.value = -1;
  else nthSelectedChoice.value = props.index;
}

function handleElimination() {
  if (props.canShowExplanation) return;
  audio.choice_eliminated.play();
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
      <!-- Tabular display -->
      <div v-if="isTabular" class="w-full">
        <table class="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td
                v-for="(cell, cellIndex) in choiceColumns"
                :key="cellIndex"
                :class="getEliminationClass()"
                class="border border-border px-3 py-2 text-left"
              >
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Default display -->
      <p
        v-else
        :class="getEliminationClass()"
        class="leading-7 hyphens-auto text-left"
      >
        {{ body }}
      </p>
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
