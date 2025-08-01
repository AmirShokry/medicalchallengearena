<script setup lang="ts">
import { UsersIcon } from "lucide-vue-next";
definePageMeta({
  layout: "lobby",
});
useSeoMeta({
  title: `MCA | Review Game`,
  description: `View the review for game user.`,
});
const route = useRoute("game-review-userId.gameId");

// import CurrentRecord from "./components/CurrentRecord.vue";
import Navigation from "@/components/ExamBlock/components/Navigation.vue";
import ExamBlock from "@/components/ExamBlock/index.vue";
import { msToMinutesAndSecondsPrecise } from "@/composables/timeFormatter";
import type { RecordMetaData } from "@/shared/types/common";

const { $trpc } = useNuxtApp();
// const sourceRecord = ref<Record>(JSON.parse(window.history.state?.record));
const errorMessage = ref("");
async function getReviewData() {
  try {
    const { cases, reviewData } = await $trpc.reviews.self.query({
      gameId: Number(route.params.gameId),
    });

    const casesData = reviewData.map(
      (rev) => cases.find((curr) => curr.id === rev.caseId)!
    );

    return { casesData, reviewData };
  } catch (error) {
    errorMessage.value = "Record data is not found 😭";
  }
}

const { casesData, reviewData } = (await getReviewData()) || {};

const currentPage = ref(1);
const statusIndicies = reviewData?.map((data) => data.isCorrect);

const totalVisible = ref(5);
const isInStudyMode = ref(false);
const isSubmitButtonVisible = ref(false);
const isNextButtonVisible = ref(false);
const isBackButtonVisible = ref(false);
const isQuestionCounterHidden = ref(true);

const cases = ref(casesData);
const nthCase = ref(0);
const nthQuestion = ref(0);
const nthQuestionFlat = ref(1);

const nthSelectedChoice = ref(
  reviewData?.[nthQuestionFlat.value - 1]?.nthSelectedChoice ?? -1
);
const nthEliminatedChoices = ref(
  new Set(reviewData?.[nthQuestionFlat.value - 1]?.nthEliminatedChoices ?? [])
);
const canShowExplanation = ref(true);

const totalQuestionsNo = computed(() =>
  cases?.value?.reduce((acc, curr) => acc + curr.questions.length, 0)
);

async function pageChanged(page: number) {
  nthQuestionFlat.value = page;

  nthCase.value = 0;
  nthQuestion.value = 0;

  for (let i = 0; i < cases?.value?.length! || 0; i++) {
    if (page > cases?.value?.[i]?.questions.length!) {
      page -= cases?.value?.[i]?.questions.length!;
    } else {
      nthCase.value = i;
      nthQuestion.value = page - 1;
      break;
    }
  }
  nthSelectedChoice.value =
    reviewData?.[nthQuestionFlat.value - 1]?.nthSelectedChoice ?? -1;
  nthEliminatedChoices.value = new Set(
    reviewData?.[nthQuestionFlat.value - 1]?.nthEliminatedChoices ?? []
  );
}

function resetData() {
  nthCase.value = 0;
  nthQuestion.value = 0;
  nthQuestionFlat.value = 1;
  nthSelectedChoice.value = -1;
  nthEliminatedChoices.value = new Set();
}
async function handleStudyMore() {
  isInStudyMode.value = true;
  isQuestionCounterHidden.value = false;
  isSubmitButtonVisible.value = true;
  canShowExplanation.value = false;

  cases.value = (await $trpc.exam.cases.studyMore.query({
    caseId: cases.value?.[nthCase.value]?.id!,
  })) as any; //TODO: Fix the type

  if (!cases.value?.length)
    errorMessage.value = "No study more questions are available for this case";
  resetData();
}

function handleSubmit() {
  isSubmitButtonVisible.value = false;
  isNextButtonVisible.value = true;
  canShowExplanation.value = true;

  if (nthQuestionFlat.value === totalQuestionsNo.value) {
    isBackButtonVisible.value = true;
    isNextButtonVisible.value = false;
  }
}

function handleNext() {
  canShowExplanation.value = false;
  isNextButtonVisible.value = false;
  isSubmitButtonVisible.value = true;

  nthQuestion.value++;
  nthQuestionFlat.value++;
  nthSelectedChoice.value = -1;
  nthEliminatedChoices.value = new Set();
}

function handleBackToMain() {
  isBackButtonVisible.value = false;
  isNextButtonVisible.value = false;
  isInStudyMode.value = false;
  isQuestionCounterHidden.value = true;
  resetData();
  canShowExplanation.value = true;
  cases.value = casesData;
  currentPage.value = 1;
  nthSelectedChoice.value =
    reviewData?.[nthQuestionFlat.value - 1]?.nthSelectedChoice ?? -1;
  nthEliminatedChoices.value = new Set(
    reviewData?.[nthQuestionFlat.value - 1]?.nthEliminatedChoices ?? []
  );
}
</script>
<template>
  <header
    class="sticky top-0 flex h-10 shrink-0 items-center gap-2 bg-background"
  >
    <div class="flex flex-1 items-center gap-2 px-3">
      <UiSidebarTrigger side="left" class="cursor-pointer" />
      <UiSidebarTrigger side="right" class="cursor-pointer ml-auto max-lg:mr-1">
        <UsersIcon />
      </UiSidebarTrigger>
    </div>
  </header>

  <div class="flex flex-1 flex-col gap-4 pt-1 m-10 px-10">
    <div
      v-if="
        (cases?.length && reviewData?.length) ||
        (cases?.length && isInStudyMode)
      "
      class="w-full h-full flex justify-center"
    >
      <div class="w-[90%] pt-10">
        <div class="flex gap-4 flex-col justify-center items-center">
          <header
            v-if="!isInStudyMode"
            class="flex flex-wrap gap-2 justify-between max-xl:justify-center w-full light-border-0.3 p-2 rounded-xl"
          >
            <Navigation
              v-model="currentPage"
              @update:model-value="pageChanged"
              :length="totalQuestionsNo"
              v-model:total-visible="totalVisible"
              :status-indicies="statusIndicies"
            />
            <!-- <CurrentRecord :source-record="sourceRecord" /> -->
          </header>
          <ExamBlock
            v-if="
              nthSelectedChoice !== undefined &&
              nthEliminatedChoices !== undefined &&
              canShowExplanation !== undefined &&
              totalQuestionsNo !== undefined
            "
            class="w-full"
            :cases="cases"
            v-model:selection="nthSelectedChoice"
            v-model:elimination="nthEliminatedChoices"
            v-model:can-show-explanation="canShowExplanation"
            :total-questions-no="totalQuestionsNo"
            :nth-case="nthCase"
            :nth-question="nthQuestion"
            :nth-question-flat="nthQuestionFlat"
          >
            <template v-if="!isInStudyMode" #header-prepend>
              <span
                class="light-box-shadow-2 p-2 rounded-lg text-sm text-nowrap flex items-center"
              >
                Time:
                {{
                  msToMinutesAndSecondsPrecise(
                    reviewData?.[nthQuestionFlat - 1]?.timeSpentMs || 0
                  )
                }}
              </span>
            </template>
            <template
              v-if="!isInStudyMode && cases?.[nthCase]?.hasStudyMode"
              #explanation-footer
            >
              <button
                @click="handleStudyMore()"
                title="Study more questions on this case"
                class="bg-black p-3 rounded-xl hover:bg-gray-700 hover:scale-90"
              >
                Study More
              </button>
            </template>
          </ExamBlock>

          <div class="w-full flex justify-center mt-8">
            <UiButton
              v-if="isSubmitButtonVisible"
              @click="handleSubmit"
              class="w-64 mt-7"
            >
              Submit
            </UiButton>
            <UiButton
              v-if="isNextButtonVisible"
              @click="handleNext"
              class="w-64 mt-7"
            >
              Next
            </UiButton>
            <UiButton
              v-if="isBackButtonVisible"
              @click="handleBackToMain"
              class="rounded-2xl bg-black p-6 font-semibold hover:bg-gray-700 text-lg hover:scale-90"
            >
              BACK TO REVIEW
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="w-full h-full relative p-5 gap-4 flex flex-col justify-center items-center"
    >
      <p class="text-center text-lg">{{ errorMessage }}</p>
    </div>
  </div>
</template>
