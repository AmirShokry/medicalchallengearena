<script setup lang="ts">
import type { ToClientIO } from "@/shared/types/socket";
import Header from "./components/Header.vue";
import Case from "./components/Case.vue";
import Question from "./components/Question.vue";
import Choice from "./components/Choice.vue";
import Explanation from "./components/Explanation.vue";
import RichText from "./components/RichText.vue";
import Tooltip from "./components/Tooltip.vue";

const props = defineProps<{
  layout?: "NBME";
  cases: Parameters<ToClientIO.Game.Events["gameStarted"]>["0"]["cases"];
  nthCase: number;
  nthQuestion: number;
  nthQuestionFlat: number;
  totalQuestionsNo: number;
}>();

const nthSelectedChoice = defineModel("selection", {
  type: Number,
  required: true,
});
const nthEliminatedChoices = defineModel("elimination", {
  type: Set<number>,
  required: true,
});
const canShowExplanation = defineModel("canShowExplanation", {
  type: Boolean,
  required: true,
});

const currentCase = computed(() => props.cases?.at(props.nthCase));
const currentQuestion = computed(() =>
  props.cases?.at(props.nthCase)?.questions?.at(props.nthQuestion)
);
const currentChoices = computed(() => currentQuestion.value?.choices || []);

const richTextRef = ref<InstanceType<typeof RichText> | null>(null);
</script>
<template>
  <div v-if="layout === 'NBME'" class="relative light-border-0.5">
    <main class="flex h-full">
      <slot name="left-aside" />
      <div class="flex w-full h-full flex-wrap">
        <section
          class="flex flex-col flex-[45%_1_1] relative light-border-0.5 p-[1px]"
        >
          <div class="flex">
            <p
              class="text-[7px] text-neutral-300 rounded-r-sm font-rubik bg-muted p-1 px-2"
            >
              {{ nthQuestionFlat }} of {{ totalQuestionsNo }}
            </p>
            <Tooltip
              :target-text="richTextRef"
              class="px-1 flex items-center gap-1 text-white ml-auto"
            />
          </div>
          <div
            class="flex flex-col max-h-[69vh] overflow-y-auto overflow-x-hidden thin-scrollbar pb-4"
          >
            <Case
              :key="currentQuestion?.body || ''"
              :img-urls="currentCase?.imgUrls!"
              class="rounded-none !pt-3 !pb-7 px-6"
            >
              <RichText
                ref="richTextRef"
                :base-font-size="0.9"
                highlight
                variable-font-size
              >
                {{ currentCase?.body }}
              </RichText>
            </Case>
            <Question
              :img-urls="currentQuestion?.imgUrls!"
              :body="currentQuestion?.body!"
              class="rounded-none small-border border-x-0 !p-6 !pb-8"
            />
            <ul class="flex flex-col">
              <Choice
                v-for="(choice, index) in currentChoices"
                v-model:selection="nthSelectedChoice"
                v-model:elimination="nthEliminatedChoices"
                :key="choice?.id"
                :index="index"
                :body="choice?.body"
                :is-correct="choice?.isCorrect!"
                :explanation="choice?.explanation"
                :choices-count="currentChoices?.length"
                :can-show-explanation="canShowExplanation!"
                class="rounded-none small-border border-x-0 py-1 px-2"
              />
            </ul>
          </div>
          <footer class="mt-auto mb-8 self-center">
            <slot name="first-section-footer"> </slot>
          </footer>
        </section>
        <section class="py-4 light-border-0.5 flex-[45%_1_1]">
          <Explanation
            :is-blured="!canShowExplanation"
            class="px-7 !rounded-none"
            :body="currentQuestion?.explanation"
            :img-urls="currentQuestion?.explanationImgUrls"
          />
        </section>
      </div>
      <slot name="right-aside" />
    </main>
  </div>

  <div v-else class="relative">
    <slot name="header">
      <Header
        class="pb-2"
        :current-question="nthQuestionFlat"
        :total="totalQuestionsNo"
      >
        <template #header-prepend>
          <slot name="header-prepend" />
        </template>
        <template #below-title>
          <slot name="below-title" />
        </template>
      </Header>
    </slot>

    <div class="flex gap-8 flex-wrap">
      <div class="flex flex-col gap-4 flex-[1_1_45%]">
        <div class="relative">
          <slot name="case-rel" />
          <Tooltip
            :key="currentQuestion?.id || ''"
            :target-text="richTextRef"
            class="px-1 absolute right-0 -top-6 flex items-center gap-1 text-white ml-auto"
          />

          <Case
            class="light-border-and-shadow max-h-[30vh] overflow-y-auto thin-scrollbar py-3"
            :key="currentQuestion?.id || ''"
            :tooltip-class="'-top-6 right-2'"
            :img-urls="currentCase?.imgUrls!"
          >
            <RichText
              ref="richTextRef"
              :base-font-size="0.9"
              highlight
              variable-font-size
              class="leading-8 hyphens-auto flex-grow whitespace-pre-wrap font-poppins"
            >
              {{ currentCase?.body }}
            </RichText>
          </Case>
        </div>
        <Question
          class="light-border-and-shadow"
          :img-urls="currentQuestion?.imgUrls!"
          :body="currentQuestion?.body!"
        />
        <ul class="flex flex-col gap-2">
          <Choice
            v-for="(choice, index) in currentChoices"
            v-model:selection="nthSelectedChoice"
            v-model:elimination="nthEliminatedChoices"
            :key="choice.id"
            :index="index"
            :body="choice.body"
            :is-correct="choice.isCorrect!"
            :explanation="choice.explanation"
            :choices-count="currentChoices?.length || 0"
            :can-show-explanation="canShowExplanation!"
            class="light-border-and-shadow p-0 text-sm"
          />
        </ul>
      </div>
      <Explanation
        v-if="canShowExplanation"
        v-model="canShowExplanation"
        :body="currentQuestion?.explanation"
        :img-urls="currentQuestion?.explanationImgUrls"
        class="flex-[1_1_50%] light-border-and-shadow"
      >
        <template #footer>
          <slot name="explanation-footer"></slot>
        </template>
      </Explanation>
    </div>
  </div>
</template>
