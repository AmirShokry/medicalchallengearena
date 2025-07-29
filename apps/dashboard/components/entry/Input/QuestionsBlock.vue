<script setup lang="ts">
import { Trash2Icon, PlusCircleIcon, NotebookPenIcon } from "lucide-vue-next";
import {
  ENTRY_PREFERENCES,
  type QuestionType,
  useInjectInputSectionRef,
} from "./Index.vue";

const { data } = useInputStore();

const inputSectionRef = useInjectInputSectionRef();
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
      class="rounded-sm border-1 relative p-4 mb-4"
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
