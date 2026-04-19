<script setup lang="ts">
import { Trash2Icon, PlusCircleIcon, NotebookPenIcon } from "lucide-vue-next";
import {
  ENTRY_PREFERENCES,
  type QuestionType,
  useInjectInputSectionRef,
} from "./Index.vue";

const inputStore = useInputStore();
const { data } = inputStore;

const inputSectionRef = useInjectInputSectionRef();

// Per-question wrapper refs keyed by question.id, used by the search-page
// "spotlight" flow to scroll to and flash a specific question.
const questionRefs = ref(new Map<number, HTMLElement>());
const flashingQuestionId = ref<number | null>(null);

function setQuestionRef(id: number, el: Element | null) {
  if (el instanceof HTMLElement) questionRefs.value.set(id, el);
  else questionRefs.value.delete(id);
}

function scrollAndFlashQuestion(questionId: number) {
  // Wait for DOM commit + the reveal of any explanation panels.
  nextTick(() => {
    const el = questionRefs.value.get(questionId);
    if (!el || !inputSectionRef?.value) return;
    const container = inputSectionRef.value;
    const elTop =
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTo({
      top: Math.max(0, elTop - 16),
      behavior: "smooth",
    });
    flashingQuestionId.value = questionId;
    setTimeout(() => {
      if (flashingQuestionId.value === questionId)
        flashingQuestionId.value = null;
    }, 2200);
  });
}

// React to highlight requests targeting a question (not a choice — choice
// targets are handled by EntryInputChoices, which scrolls to the <li>).
watch(
  () => inputStore.highlightTarget,
  (target) => {
    if (!target) return;
    if (target.questionId == null) return;
    if (target.choiceId != null) return; // let Choices.vue handle it
    scrollAndFlashQuestion(target.questionId);
  },
  { immediate: true, deep: true }
);

function onDeleteBlock(index: number) {
  if (data.questions.length - 1 == 0) return;
  data.questions.splice(index, 1);
  if (data.questions.length === 1) data.questions[0].isStudyMode = false;
}
function onAddBlock() {
  data.questions.push({
    id: new Date().getTime(),
    body: "",
    imgUrls: [] as string[],
    explanation: "",
    type: "Default" as QuestionType,
    header: "",
    explanationImgUrls: [] as string[],
    isStudyMode: false,
    choices: getEmptyChoices(),
  });
  nextTick(() => {
    if (!inputSectionRef || !inputSectionRef.value) return;
    inputSectionRef.value.scrollTo({
      top: inputSectionRef.value.scrollHeight,
      behavior: "smooth",
    });
  });
}
function onToggleStudyMode(index: number) {
  data.questions[index].isStudyMode = !data.questions[index].isStudyMode;
}

function getEmptyChoices() {
  return Array.from({ length: ENTRY_PREFERENCES.value.CHOICES_ROWS }, () => {
    return {
      id: new Date().getTime(),
      body: "",
      isCorrect: false,
      explanation: "",
    };
  });
}
</script>

<template>
  <div aria-role="questions-block">
    <div
      v-auto-animate
      v-for="(question, questionIndex) in data.questions"
      :key="question.id"
      :ref="(el) => setQuestionRef(question.id, el as Element | null)"
      class="rounded-sm border-1 relative p-4 mb-4 transition-all duration-300"
      :class="
        flashingQuestionId === question.id
          ? 'ring-2 ring-primary/70 shadow-[0_0_0_4px_rgba(59,130,246,0.15)] bg-primary/5'
          : ''
      "
    >
      <EntryInputQuestion class="mb-4" :question-index>
        <template #toolbar>
          <div aria-role="questions-toolbar" class="flex items-center gap-2">
            <Button
              title="Toggle study mode"
              @click="onToggleStudyMode(questionIndex)"
              variant="link"
              :class="
                question.isStudyMode ? 'text-success-foreground' : undefined
              "
              class="cursor-pointer hover:text-success !p-0"
              :disabled="data.questions.length <= 1"
            >
              <NotebookPenIcon :size="16" />
            </Button>
            <Button
              title="Add block"
              @click="onAddBlock"
              variant="link"
              class="cursor-pointer hover:text-muted-foreground !p-0"
            >
              <PlusCircleIcon :size="16" />
            </Button>
            <Button
              title="Delete Block"
              @click="onDeleteBlock(questionIndex)"
              variant="link"
              class="cursor-pointer hover:text-destructive !p-0"
              :disabled="data.questions.length <= 1"
            >
              <Trash2Icon :size="16" />
            </Button>
          </div>
        </template>
      </EntryInputQuestion>

      <EntryInputChoices :question-index="questionIndex" />
      <EntryInputExplanation class="mb-4" :question-index />
    </div>
  </div>
</template>
