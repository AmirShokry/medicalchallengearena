<script setup lang="ts">
import { LogOutIcon as ExitIcon, PauseIcon, PlayIcon } from "lucide-vue-next";
import getGameData from "../../../components/Exam/index";
import ExamBlock from "../../../components/ExamBlock/index.vue";
import BeforeGameAnimation from "../../../components/splash/BeforeGameAnimation.vue";
import UserInfo from "../../../components/Exam/Player.vue";
import Result from "../../../components/Exam/Result/index.vue";
import { gameSocket } from "../../../components/socket";
import SinglePagination from "../../../components/Exam/pagination/SinglePagination.vue";
import useSocial from "@/composables/useSocial";

definePageMeta({
  layout: "blank",
  middleware: "exam",
});

const {
  user,
  cases,
  canViewAnswer,
  correctChoiceIdx,
  hasGameEnded,
  current,
  lastReachedQuestionNumber,
  isCorrect,
  totalQuestionsNumber,
  flags,
  getRecordData,
  revertState,
} = getGameData();

const { user: $$user } = storeToRefs(useUserStore());
const audio = useAudioStore();
const $$game = useGameStore();
const { $trpc } = useNuxtApp();
const $router = useRouter();
const hasAnimationEnded = ref(false),
  isSubmitButtonVisible = ref(true),
  isNextButtonVisible = ref(false);

const isPaused = ref(false);

const QUESTION_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function togglePause() {
  if (isPaused.value) {
    user.timer.resume();
    isPaused.value = false;
  } else {
    user.timer.pause();
    isPaused.value = true;
  }
}

let hasIntentionallyLeft = false;

function handleGameStarted() {
  hasAnimationEnded.value = true;
  // Start timer with current local time (no server sync needed for solo)
  // For solo mode, serverTime and startTimestamp are the same (current time)
  const now = Date.now();
  user.timer.start(now, now, QUESTION_DURATION_MS, handleTimeOut);
}

function handleTimeOut() {
  if (flags.ingame.isReviewingQuestion) revertState();
  audio.incorrect_answer.play();
  user.flags.hasSolved = true;
  user.records.stats.wrongAnswersCount++;

  const recordData = getRecordData({
    medPoints: 0,
    correctOverride: false,
    timeSpentMs: user.timer.getStartingTimeMs(),
  });
  user.records.data.push(recordData);
  handleNext();
}

function handleSubmit() {
  if (current.selectedChoiceIdx === -1 || flags.ingame.isReviewingQuestion)
    return;
  isSubmitButtonVisible.value = false;

  canViewAnswer.value = true;
  user.flags.hasSolved = true;
  user.timer.stop();

  let medPointsGained = 0,
    foundIncorrectElimination = false;

  if (current.eliminatedChoicesIdx.size > 0) {
    if (current.eliminatedChoicesIdx.has(correctChoiceIdx.value!)) {
      user.records.stats.wrongEliminationsCount++;
      medPointsGained = -10;
      foundIncorrectElimination = true;
    } else {
      audio.incorrect_answer.play();
      user.records.stats.correctEliminationsCount +=
        current.eliminatedChoicesIdx.size - 1;
      medPointsGained += current.eliminatedChoicesIdx.size - 1;
    }
  }

  if (!foundIncorrectElimination) {
    if (isCorrect.value) {
      user.records.stats.correctAnswersCount++;
      medPointsGained = 10;

      audio.correct_answer.play();
    } else {
      audio.incorrect_answer.play();
      user.records.stats.wrongAnswersCount++;
    }
  }
  user.records.stats.totalMedpoints += medPointsGained;
  const recordData = getRecordData({
    medPoints: user.records.stats.totalMedpoints,
    timeSpentMs: user.timer.getElapseTimeMs(),
  });
  user.records.data.push(recordData);

  if (hasGameEnded.value) return handleGameFinished();

  isNextButtonVisible.value = true;
}

async function handleGameFinished() {
  flags.ingame.isGameFinished = true;
  function savePlayersDataLocally() {
    if (!$$user.value) return;
    user.info.medPoints = $$user.value.medPoints! +=
      user.records.stats.totalMedpoints;
    $$user.value.questionsCorrect! += user.records.stats.correctAnswersCount;
    $$user.value.eliminationsTotal! +=
      user.records.stats.correctEliminationsCount +
      user.records.stats.wrongEliminationsCount;
    $$user.value.questionsTotal! += totalQuestionsNumber;
    $$user.value.gamesTotal! += 1;
  }
  savePlayersDataLocally();
  user.records.stats.totalTimeSpentMs = user.records.data.reduce(
    (acc, record) => acc + (record.timeSpentMs ?? 0),
    0
  );

  if (!$$game.gameId) {
    console.error("[Solo] No game ID found, cannot save stats");
    return;
  }

  try {
    console.log("[Solo] Saving game stats:", {
      gameId: $$game.gameId,
      stats: user.records.stats,
      dataLength: user.records.data.length,
    });

    await $trpc.exam.endGame.mutate({
      gameId: $$game.gameId!,
      record: user.records,
    });

    console.log("[Solo] Game stats saved successfully");
  } catch (error) {
    console.error("[Solo] Failed to save game stats:", error);
  }
}

function handleNext() {
  revertState();
  window.scrollTo(0, 0);
  // Restart timer with new local timestamp
  const now = Date.now();
  user.timer.restart(now, now, QUESTION_DURATION_MS);
  isNextButtonVisible.value = false;
  isSubmitButtonVisible.value = true;
  isPaused.value = false;

  current.questionNumber++;
  lastReachedQuestionNumber.value++;

  if (current.questionIdx + 1 < cases?.at(current.caseIdx)?.questions.length!)
    return current.questionIdx++;
  current.caseIdx++;
  current.questionIdx = 0;
}

const currentPlayerStatus = computed(() => {
  if (!user.flags.hasSolved) return "pending";

  const lastRecord = user.records.data?.at(lastReachedQuestionNumber.value - 1);
  if (!lastRecord) return "pending";
  return lastRecord.isCorrect ? "correct" : "incorrect";
});

const social = useSocial();

function handleLeaveGame(fromAction?: boolean) {
  if (fromAction) hasIntentionallyLeft = true;
  if (hasIntentionallyLeft) return;
  $$game["~resetEverything"]();
  user.timer.destroy();
  $$game.mode = undefined;
  gameSocket.emit("userLeft");
  // Set status back to online when leaving the game
  social.setStatus("online");
  $router.replace({ name: "game-lobby" });
}
onBeforeUnmount(() => {
  // Don't trigger leave game during HMR in development
  if (import.meta.dev && import.meta.hot) return;

  if (!flags.ingame.isGameFinished) handleLeaveGame();
  // Set status to online when game finishes
  social.setStatus("online");
});

onUnmounted(() => user.timer.destroy());
</script>
<template>
  <div class="px-20 h-full flex flex-col py-4">
    <div class="flex items-center w-full">
      <UserInfo
        class="scale-[0.7] pb-0"
        :username="user.info.username"
        :avatar-url="user.info.avatarUrl!"
        :med-points="user.records.stats.totalMedpoints"
        :time="user.timer.time!"
        :rank="1"
        :status="currentPlayerStatus"
      />
      <SinglePagination
        class="p-2 light-border-and-shadow rounded-md w-full"
        v-model:current-indexes="current"
        v-model:can-show-explanation="canViewAnswer"
        v-model:is-reviewing="flags.ingame.isReviewingQuestion"
        :pending-index="lastReachedQuestionNumber"
        :total-questions-count="totalQuestionsNumber"
        :revert-state="revertState"
        :records="user.records.data"
      />
      <UiButton @click="togglePause" variant="ghost" class="ml-4 w-24">
        <PlayIcon v-if="isPaused" class="mr-2 h-4 w-4" />
        <PauseIcon v-else class="mr-2 h-4 w-4" />
        {{ isPaused ? "Resume" : "Pause" }}
      </UiButton>
    </div>
    <div class="py-2 h-full relative">
      <ExamBlock
        v-if="
          current.selectedChoiceIdx !== undefined &&
          current.eliminatedChoicesIdx !== undefined &&
          canViewAnswer !== undefined &&
          totalQuestionsNumber !== undefined
        "
        class="w-full transition-opacity duration-300"
        :class="{ 'opacity-50 pointer-events-none': isPaused }"
        :cases="cases"
        v-model:selection="current.selectedChoiceIdx"
        v-model:elimination="current.eliminatedChoicesIdx"
        v-model:can-show-explanation="canViewAnswer"
        :total-questions-no="totalQuestionsNumber"
        :nth-case="current.caseIdx"
        :nth-question="current.questionIdx"
        :nth-question-flat="current.questionNumber"
      >
        <template #header>{{}}</template>
        <template #case-rel>
          <p
            class="absolute top-0 left-:0 pt-[2px] rounded-tl-md text-[7px] font-bold bg-muted text-primary px-2"
          >
            {{ current.questionNumber }} of
            {{ totalQuestionsNumber }}
          </p>
        </template>
      </ExamBlock>
    </div>
    <div class="w-full flex justify-center mt-auto mb-32">
      <UiButton
        v-if="isSubmitButtonVisible && !flags.ingame.isReviewingQuestion"
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
    </div>
  </div>
  <ExitIcon
    :size="30"
    color="#8b0000"
    title="Leave Game"
    class="!absolute right-4 bottom-4 cursor-pointer hover:scale-110"
    v-confirm-click="{
      handler: () => handleLeaveGame(true),
      message: 'Are you sure you want to leave the game?',
    }"
  />
  <BeforeGameAnimation
    v-if="!hasAnimationEnded"
    @end="handleGameStarted"
    start-immediately
  >
    <template #user-vs-opponent>{{ undefined }}</template>
  </BeforeGameAnimation>
  <Result
    v-if="flags.ingame.isGameFinished"
    mode="Single"
    :user="user"
    :totalQuestionsNumber="totalQuestionsNumber"
  />
</template>
