<script setup lang="ts">
import {
  PlusCircleIcon,
  MinusCircleIcon,
  CircleCheckIcon,
  CircleQuestionMarkIcon,
} from "lucide-vue-next";
import { ENTRY_PREFERENCES } from "./Index.vue";
const props = defineProps<{
  questionIndex: number;
}>();
const inputStore = useInputStore();
const activeQuestion = computed(
  () => inputStore.data.questions[props.questionIndex]
);
const questionType = computed(() => activeQuestion.value?.type);
const columnsCount = ref(getColumnsCount());
const rowsCount = ref(getRowsCount());
const choiceSegments = ref(initChoiceSegments());
const headerSegments = ref(initHeaderSegments());

function getRowsCount() {
  return (
    activeQuestion.value?.choices?.length ||
    ENTRY_PREFERENCES.value.CHOICES_ROWS
  );
}
function getColumnsCount() {
  if (questionType.value === "Default") return 1;
  if (activeQuestion.value?.header)
    return (
      activeQuestion.value.header.split("\t").length ||
      ENTRY_PREFERENCES.value.CHOICES_COLUMNS
    );
  return ENTRY_PREFERENCES.value.CHOICES_COLUMNS;
}

function initChoiceSegments() {
  const rows = activeQuestion.value?.choices?.length || rowsCount.value;
  const cols = columnsCount.value;
  return Array.from({ length: rows }, (_, row) => {
    return Array.from({ length: cols }, (_, col) => {
      if (questionType.value === "Default")
        return activeQuestion.value?.choices?.[row]?.body || "";
      if (questionType.value === "Tabular")
        return (
          activeQuestion.value?.choices?.[row]?.body?.split("\t")?.[col] || ""
        );
      return "";
    });
  });
}

function initHeaderSegments() {
  const cols = columnsCount.value;
  return Array.from({ length: cols }, (_, col) => {
    if (questionType.value === "Default") return "";
    if (questionType.value === "Tabular")
      return activeQuestion.value?.header?.split("\t")?.[col] || "";
    return "";
  });
}

// Define explanationVisibility before the watcher that uses it
const choices = computed(() => activeQuestion.value?.choices || []);
const explanationVisibility = ref<Record<number, boolean>>(
  Object.fromEntries(choices.value.map((_, index) => [index, false]))
);

// Watch for changes in the underlying question data to reinitialize local state
// This ensures reactivity when editing a case or when store data changes
watch(
  () => [
    activeQuestion.value?.id,
    activeQuestion.value?.choices?.length,
    inputStore.data.id,
  ],
  () => {
    if (!activeQuestion.value) return;
    columnsCount.value = getColumnsCount();
    rowsCount.value = getRowsCount();
    choiceSegments.value = initChoiceSegments();
    headerSegments.value = initHeaderSegments();
    explanationVisibility.value = Object.fromEntries(
      (activeQuestion.value?.choices || []).map((_, index) => [index, false])
    );
  },
  { immediate: false }
);

function onQuestionTypeChange() {
  function clearChoicesData() {
    activeQuestion.value.choices.forEach((choice) => {
      choice.body = "";
      choice.isCorrect = false;
      choice.explanation = "";
    });
    activeQuestion.value.header = "";
    explanationVisibility.value = Object.fromEntries(
      activeQuestion.value.choices.map((_, index) => [index, false])
    );
    choiceSegments.value = initChoiceSegments();
    headerSegments.value = initHeaderSegments();
  }

  clearChoicesData();
  columnsCount.value = getColumnsCount();
  rowsCount.value = getRowsCount();
}

function onHeaderInput() {
  activeQuestion.value.header = headerSegments.value.join("\t");
}

function onChoiceInput(row: number, col: number) {
  if (questionType.value === "Default")
    return (activeQuestion.value.choices[row].body =
      choiceSegments.value[row][col]!);

  if (questionType.value === "Tabular")
    return (activeQuestion.value.choices[row].body =
      choiceSegments.value[row].join("\t"));
}

function handleAddChoice() {
  const id = new Date().getTime();
  activeQuestion.value.choices.push({
    id,
    body: "",
    explanation: "",
    isCorrect: false,
  });
  choiceSegments.value.push(
    Array.from({ length: columnsCount.value }, () => "")
  );

  rowsCount.value = getRowsCount();
}
function handleRemoveChoice() {
  if (activeQuestion.value.choices.length <= 2) return;
  activeQuestion.value.choices.pop();
  choiceSegments.value.pop();

  rowsCount.value = getRowsCount();
}

function handleCheckChoice(row: number) {
  activeQuestion.value.choices[row].isCorrect =
    !activeQuestion.value.choices[row].isCorrect;
  activeQuestion.value.choices.forEach((choice, i) => {
    if (i !== row) choice.isCorrect = false;
  });
}
// choices and explanationVisibility are now defined earlier in the script

function hanldeToggleExplanation(index: number) {
  explanationVisibility.value[index] = !explanationVisibility.value[index];
}

function handleAddColumn() {
  columnsCount.value++;
  headerSegments.value.push("");
  choiceSegments.value.forEach((row) => row.push(""));
}

function handleDeleteColumn() {
  if (columnsCount.value <= 2) return;
  columnsCount.value--;
  headerSegments.value.pop();
  choiceSegments.value.forEach((row) => row.pop());
}
</script>

<template>
  <section aria-role="choices-root" class="@container/choices-input">
    <div
      class="flex justify-between gap-2 items-center flex-wrap my-4"
      aria-role="choices-header"
    >
      <div class="flex items-center gap-2">
        <Label
          v-if="questionType === 'Default'"
          for="choice"
          class="after:content-['Choices'] @max-[150px]:after:content-['C']"
        />
        <Label
          v-else
          class="after:content-['Header'] @max-[150px]:after:content-['H']"
          for="header"
        />
        <Button
          title="Add choice to end"
          variant="link"
          @click="handleAddChoice"
          class="!p-0 hover:text-muted-foreground cursor-pointer"
        >
          <PlusCircleIcon />
        </Button>
        <Button
          title="Remove choice from end"
          variant="link"
          @click="handleRemoveChoice"
          class="!p-0 hover:text-muted-foreground cursor-pointer"
        >
          <MinusCircleIcon />
        </Button>
      </div>

      <Select
        v-model="activeQuestion.type"
        @update:model-value="onQuestionTypeChange"
      >
        <SelectTrigger class="cursor-pointer !h-6">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Default">Default</SelectItem>
          <SelectItem value="Tabular">Tabular</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div aria-role="question-header" v-if="questionType === 'Tabular'">
      <ul class="flex gap-2 mb-2">
        <li
          class="flex-1"
          aria-role="header-segments"
          v-for="(_, col) in columnsCount"
          :key="`header-${col}`"
        >
          <Input
            v-model="headerSegments[col]"
            :name="`header-${props.questionIndex}-${col}`"
            :key="`header-${props.questionIndex}-${col}`"
            @update:model-value="onHeaderInput"
            form="submit-input"
            required
            tabindex="1"
          />
        </li>
        <li aria-role="column-control" class="flex gap-1 ml-auto">
          <Button
            title="Add column"
            @click="handleAddColumn"
            variant="link"
            class="!p-0 hover:text-muted-foreground cursor-pointer"
          >
            <PlusCircleIcon />
          </Button>
          <Button
            title="Remove column"
            @click="handleDeleteColumn"
            variant="link"
            class="!p-0 hover:text-muted-foreground cursor-pointer"
          >
            <MinusCircleIcon />
          </Button>
        </li>
      </ul>
      <Separator class="my-4" />
    </div>
    <ul class="grid gap-2">
      <li
        v-for="(_, row) in rowsCount"
        :key="`choice-row-${_}`"
        class="flex flex-col gap-2"
      >
        <div class="flex gap-2">
          <Input
            v-for="(_, col) in columnsCount"
            :key="`choice-${props.questionIndex}-${row}-${col}`"
            :name="`choice-${props.questionIndex}-${row}-${col}`"
            v-model="choiceSegments[row][col]"
            @update:model-value="onChoiceInput(row, col)"
            required
            form="submit-input"
            tabindex="1"
          />

          <div class="flex gap-1 ml-1">
            <Button
              variant="link"
              title="Mark correct"
              @click="handleCheckChoice(row)"
              :class="
                activeQuestion.choices[row].isCorrect === true
                  ? 'text-success-foreground'
                  : ''
              "
              tabindex="-1"
              class="hover:text-success !p-0 cursor-pointer relative"
            >
              <Input
                type="radio"
                :name="`check-${questionIndex}`"
                :checked="activeQuestion.choices[row].isCorrect"
                required
                class="absolute opacity-0 pointer-events-none"
                form="submit-input"
              >
              </Input>
              <CircleCheckIcon :size="18" />
            </Button>
            <Button
              title="Add explanation"
              @click="hanldeToggleExplanation(row)"
              variant="link"
              tabindex="-1"
              class="hover:text-muted !p-0 cursor-pointer"
            >
              <CircleQuestionMarkIcon :size="18" />
            </Button>
          </div>
        </div>
        <Input
          v-if="explanationVisibility[row]"
          v-model="activeQuestion.choices[row].explanation!"
          :name="`explanation-${props.questionIndex}-${row}`"
          placeholder="Explanation"
          form="submit-input"
          class="mt-1 mb-2"
        />
      </li>
    </ul>
  </section>
</template>
