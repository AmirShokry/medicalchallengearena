<script setup lang="ts">
const audio = useAudioStore();

const nthSelectedChoice = defineModel("selection", {
  type: Number,
  required: true,
});
const nthEliminatedChoices = defineModel("elimination", {
  type: Set<number>,
  required: true,
});

const props = defineProps<{
  header: string;
  choices: {
    id: number;
    body: string;
    isCorrect?: boolean | null;
    explanation?: string | null;
  }[];
  canShowExplanation: boolean;
}>();

// Parse header into rows (first row is column headers)
function parseTabularHeader(header: string): string[][] {
  if (!header) return [];
  const rows = header
    .trim()
    .split(/\n/)
    .filter((row) => row.trim());
  return rows.map((row) => {
    const cols = row.includes("\t") ? row.split("\t") : row.split(/\s{2,}/);
    return cols.map((col) => col.trim()).filter((col) => col);
  });
}

// Parse choice body into columns
function parseChoiceColumns(body: string): string[] {
  if (!body) return [];
  const cols = body.includes("\t") ? body.split("\t") : body.split(/\s{2,}/);
  return cols.map((col) => col.trim()).filter((col) => col);
}

const headerRows = computed(() => parseTabularHeader(props.header));
const headerColumnCount = computed(() => headerRows.value[0]?.length || 0);

const explanationVisibility = ref<Record<number, boolean>>({});

function isSelected(index: number) {
  return nthSelectedChoice.value === index;
}

function isEliminated(index: number) {
  return nthEliminatedChoices.value.has(index);
}

function handleSelection(index: number) {
  audio.choice_selected.play();
  if (props.canShowExplanation) {
    explanationVisibility.value[index] = !explanationVisibility.value[index];
    return;
  }

  if (isEliminated(index)) nthEliminatedChoices.value.delete(index);
  if (isSelected(index)) nthSelectedChoice.value = -1;
  else nthSelectedChoice.value = index;
}

function handleElimination(index: number) {
  if (props.canShowExplanation) return;
  audio.choice_eliminated.play();
  if (isSelected(index)) nthSelectedChoice.value = -1;
  if (nthEliminatedChoices.value.has(index))
    nthEliminatedChoices.value.delete(index);
  else if (nthEliminatedChoices.value.size + 1 < props.choices.length)
    nthEliminatedChoices.value.add(index);
}

function getChoiceRowClass(
  index: number,
  choice: { isCorrect?: boolean | null }
) {
  if (!props.canShowExplanation && isSelected(index)) return "bg-muted";

  if (props.canShowExplanation) {
    if (choice.isCorrect) return "bg-green-900 not-dark:text-white";
    if (isSelected(index)) return "bg-red-900 not-dark:text-white";
    if (explanationVisibility.value[index])
      return "border-red-400 border-solid border-[1.2px]";
  }
  return "";
}

function getEliminationClass(
  index: number,
  choice: { isCorrect?: boolean | null }
) {
  if (!props.canShowExplanation && isEliminated(index)) return "line-through";
  if (choice.isCorrect && isEliminated(index))
    return "line-through decoration-red-700 decoration-2";
  if (isEliminated(index))
    return "line-through decoration-green-700 decoration-2";
  return "";
}
</script>

<template>
  <div class="w-full overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <!-- Header rows from question -->
      <thead>
        <tr
          v-for="(row, rowIndex) in headerRows"
          :key="'header-' + rowIndex"
          :class="rowIndex === 0 ? 'bg-muted font-semibold' : 'bg-muted/50'"
        >
          <td
            v-for="(cell, cellIndex) in row"
            :key="'header-cell-' + cellIndex"
            class="border border-border px-3 py-2 text-left"
          >
            {{ cell }}
          </td>
        </tr>
      </thead>
      <!-- Choice rows -->
      <tbody>
        <template v-for="(choice, index) in choices" :key="choice.id">
          <tr
            @click="handleSelection(index)"
            @contextmenu.prevent="handleElimination(index)"
            :class="getChoiceRowClass(index, choice)"
            class="cursor-pointer hover:bg-muted/70 transition-colors"
          >
            <td
              v-for="(cell, cellIndex) in parseChoiceColumns(choice.body)"
              :key="'choice-cell-' + cellIndex"
              :class="getEliminationClass(index, choice)"
              class="border border-border px-3 py-2 text-left"
            >
              {{ cell }}
            </td>
            <!-- Fill remaining columns if choice has fewer columns than header -->
            <td
              v-for="n in Math.max(
                0,
                headerColumnCount - parseChoiceColumns(choice.body).length
              )"
              :key="'empty-' + n"
              class="border border-border px-3 py-2"
            ></td>
          </tr>
          <!-- Explanation row -->
          <tr
            v-if="
              canShowExplanation &&
              explanationVisibility[index] &&
              choice.explanation
            "
          >
            <td
              :colspan="headerColumnCount"
              :class="choice.isCorrect ? 'text-success' : 'text-destructive'"
              class="border border-border px-3 py-2 bg-background"
            >
              {{ choice.explanation }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
