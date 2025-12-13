<script setup lang="ts">
import MultiPagination from "../../../components/Exam/pagination/MultiPagination.vue";
import UserInfo from "../../../components/Exam/Player.vue";
import OpponentInfo from "../../../components/Exam/Player.vue";
import BeforeGameAnimation from "../../../components/splash/BeforeGameAnimation.vue";
import ExamBlock from "../../../components/ExamBlock/index.vue";
import Result from "../../../components/Exam/Result/index.vue";
import { gameSocket } from "../../../components/socket";
import getGameData from "../../../components/Exam/index";
import { LogOutIcon as ExitIcon } from "lucide-vue-next";
import useSocial from "@/composables/useSocial";
import { useGameReconnection } from "@/composables/useGameReconnection";

definePageMeta({
  layout: "blank",
  middleware: "exam",
});
const $$game = useGameStore();
const $$user = useUserStore();
const audio = useAudioStore();
const $router = useRouter();
const {
  user,
  opponent,
  cases,
  flags,
  current,
  totalQuestionsNumber,
  correctChoiceIdx,
  isCorrect,
  lastReachedQuestionNumber,
  canViewAnswer,
  canSubmit,
  getRecordData,
  revertState,
  hasGameEnded,
  opponentStatus,
  userStatus,
} = getGameData();

// Setup reconnection handling
const {
  isReconnecting,
  isOpponentAway,
  isOpponentDisconnected,
  setupReconnection,
  cleanupReconnection,
  restoreGameState,
} = useGameReconnection();

// Computed property for opponent connection display status
const opponentConnectionStatus = computed(() => {
  if (isOpponentDisconnected.value) return "reconnecting";
  if (isOpponentAway.value) return "away";
  return "connected";
});

onMounted(() => {
  flags.matchmaking["~reset"]();
  user.records["~reset"]();
  opponent.records["~reset"]();
  user.flags.hasAccepted = false;
  opponent.flags.hasAccepted = false;
  flags.ingame.isGameStarted = true;

  // Setup reconnection listeners
  setupReconnection();

  // Timer events are disabled - no timeout functionality
  gameSocket.on("questionStarted", (_data) => {
    // Timer is disabled - just set running state
    user.timer.start();
    opponent.timer.start();
  });

  // Pause events are disabled
  gameSocket.on("gamePaused", () => {
    // No-op - pause disabled
  });

  gameSocket.on("gameResumed", (_data) => {
    // No-op - pause disabled
  });

  // Handle game session restoration (in case we reconnect while already on this page)
  gameSocket.on("gameSessionRestored", (data) => {
    console.log("[Multi] Game session restored:", data);
    if (data.gameState) {
      restoreGameState(data.gameState);
      // Update current question position
      current.caseIdx = data.gameState.userProgress.currentCaseIdx;
      current.questionIdx = data.gameState.userProgress.currentQuestionIdx;
      current.questionNumber =
        data.gameState.userProgress.currentQuestionNumber;
      lastReachedQuestionNumber.value =
        data.gameState.userProgress.currentQuestionNumber;
    }
  });
});

// Set user status to ingame when in game (server should have already set this)
const social = useSocial();
social.setStatus("ingame");

console.log($$game.players.opponent.info);

const hasAnimationEnded = ref(false),
  hasRecordBeenSent = ref(false);

function startGame() {
  hasAnimationEnded.value = true;
  // Request server to start the question timer (timer is disabled on frontend)
  gameSocket.emit("startQuestionTimer");
}

function handleSubmit() {
  if (current.selectedChoiceIdx === -1 || flags.ingame.isReviewingQuestion)
    return;
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
      user.records.stats.correctEliminationsCount +=
        current.eliminatedChoicesIdx.size - 1;

      medPointsGained += current.eliminatedChoicesIdx.size - 1;
    }
  }

  if (!foundIncorrectElimination) {
    if (isCorrect.value) {
      medPointsGained = 10;
      user.records.stats.correctAnswersCount++;
      audio.correct_answer.play();
    } else {
      audio.incorrect_answer.play();
      user.records.stats.wrongAnswersCount++;
    }
  }

  user.records.stats.totalMedpoints += medPointsGained;

  const recordData = getRecordData({
    medPoints: user.records.stats.totalMedpoints,
    timeSpentMs: 0, // Timer disabled - always 0
  });
  user.records.data.push(recordData);
  gameSocket.emit("userSolved", recordData, user.records.stats);
}

watchEffect(() => {
  if (
    user.flags.hasSolved &&
    (opponent.flags.hasLeft || opponent.flags.hasSolved)
  ) {
    opponent.flags.hasSolved = false;
    user.flags.hasSolved = false;

    revertState();
    window.scrollTo(0, 0);

    if (hasGameEnded.value) return endGame();

    // Request server to start next question timer
    // The questionStarted event will trigger timer.restart() with server timestamp
    gameSocket.emit("advanceQuestion");

    function advanceQuestion() {
      flags.ingame.isReviewingQuestion = false;
      current.questionNumber++;
      lastReachedQuestionNumber.value++;

      if (
        current.questionIdx + 1 <
        cases?.[current?.caseIdx]?.questions?.length!
      )
        return current.questionIdx++;

      current.caseIdx++;
      current.questionIdx = 0;
    }

    advanceQuestion();
  }
});

gameSocket.on("opponentSolved", (data, stats) => {
  opponent.timer.stop();
  opponent.records.data.push(data);
  opponent.records.stats = stats;
  opponent.flags.hasSolved = true;
});

// onTimeOut is disabled - no timeout functionality

function endGame() {
  flags.ingame.isGameFinished = true;
  function savePlayersData() {
    if ($$user.user) {
      user.info.medPoints = $$user.user.medPoints! +=
        user.records.stats.totalMedpoints;
      $$user.user.questionsCorrect! += user.records.stats.correctAnswersCount;
      $$user.user.questionsTotal! += totalQuestionsNumber;
      $$user.user.gamesTotal! += 1;
    }

    if (!opponent.flags.hasLeft)
      opponent.info.medPoints! += opponent.records.stats.totalMedpoints;
  }
  savePlayersData();
  user.records.stats.totalTimeSpentMs = user.records.data.reduce(
    (acc, record) => acc + (record.timeSpentMs ?? 0),
    0
  );

  if (!hasRecordBeenSent.value && $$game.gameId) {
    console.log("[Multi] Saving game stats:", {
      gameId: $$game.gameId,
      stats: user.records.stats,
      dataLength: user.records.data.length,
    });
    gameSocket.emit("userFinishedGame", $$game.gameId!, user.records);
    hasRecordBeenSent.value = true;
  } else if (!$$game.gameId) {
    console.error("[Multi] No game ID found, cannot save stats");
  }
}

function onLeaveGame() {
  $$game["~resetEverything"]();
  user.timer.destroy();
  opponent.timer.destroy();
  gameSocket.emit("userLeft");
  // Set status back to online when leaving the game
  social.setStatus("online");
  $router.replace({ name: "game-lobby" });
}

onBeforeUnmount(() => {
  if (hasGameEnded.value && !hasRecordBeenSent.value) {
    gameSocket.emit("userFinishedGame", $$game.gameId!, user.records);
    hasRecordBeenSent.value = true;
  }

  // Cleanup reconnection handlers
  cleanupReconnection();

  gameSocket.off("gamePaused");
  gameSocket.off("gameResumed");
  gameSocket.off("opponentSolved");
  gameSocket.off("questionStarted");
  gameSocket.off("gameSessionRestored");
  user.timer.destroy();
  opponent.timer.destroy();
  $$game["~resetEverything"]();
  gameSocket.emit("userLeft");
  // Set status back to online when leaving the game
  social.setStatus("online");
});
</script>
<template>
  <BeforeGameAnimation v-if="!hasAnimationEnded" @end="startGame" />

  <!-- Reconnecting overlay -->
  <div
    v-if="isReconnecting"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
  >
    <div class="bg-background rounded-lg p-6 text-center shadow-xl">
      <div
        class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
      ></div>
      <p class="text-lg font-semibold">Reconnecting...</p>
      <p class="text-sm text-muted-foreground mt-2">
        Please wait while we restore your game
      </p>
    </div>
  </div>

  <!-- Opponent connection status banner -->
  <div
    v-if="
      opponentConnectionStatus === 'reconnecting' && !opponent.flags.hasLeft
    "
    class="fixed top-0 flex items-center justify-center w-full z-40 text-center py-2 text-sm font-medium"
  >
    <span
      class="flex items-center bg-amber-400 justify-center text-primary-foreground gap w-fit p-2 rounded-sm"
    >
      <div
        class="animate-spin w-4 h-4 border-2 border-primray border-t-transparent rounded-full"
      ></div>
      &nbsp; Opponent is reconnecting..
    </span>
  </div>

  <ExitIcon
    :size="18"
    color="#8b0000"
    title="Leave Game"
    class="!absolute right-2 bottom-2 cursor-pointer hover:scale-110"
    v-confirm-click="{
      handler: onLeaveGame,
      message: 'Are you sure you want to leave the game?',
    }"
  />
  <div class="w-full h-full flex flex-col pb-4 pt-8">
    <div class="flex justify-between mb-3 py-2 px-6">
      <UserInfo
        :username="user.info.username"
        :avatar-url="user.info.avatarUrl!"
        :med-points="user.records.stats.totalMedpoints"
        :time="user.timer.time!"
        :rank="1"
        :status="userStatus"
      />

      <OpponentInfo
        v-if="!opponent.flags.hasLeft"
        :username="opponent.info.username"
        :avatar-url="opponent.info.avatarUrl!"
        :med-points="opponent.records.stats.totalMedpoints"
        :time="opponent.timer.time!"
        :rank="2"
        :status="opponentStatus"
      />
    </div>

    <div class="relative grow mb-4 overflow-hidden">
      <ExamBlock
        :layout="'NBME'"
        :cases="cases"
        v-model:selection="current.selectedChoiceIdx"
        v-model:elimination="current.eliminatedChoicesIdx"
        v-model:can-show-explanation="canViewAnswer"
        :nth-case="current.caseIdx"
        :nth-question="current.questionIdx"
        :nth-question-flat="current.questionNumber"
        :totalQuestionsNo="totalQuestionsNumber"
        class="w-full h-full transition-opacity duration-300"
      >
        <template #left-aside>
          <MultiPagination
            v-model:current-indexes="current"
            v-model:is-reviewing="flags.ingame.isReviewingQuestion"
            v-model:can-show-explanation="canViewAnswer"
            :revert-state="revertState"
            :max-question="lastReachedQuestionNumber"
            :length="totalQuestionsNumber"
            :records="user.records.data"
          />
        </template>
        <template v-if="!opponent.flags.hasLeft" #right-aside>
          <MultiPagination
            v-model:current-indexes="current"
            v-model:is-reviewing="flags.ingame.isReviewingQuestion"
            v-model:can-show-explanation="canViewAnswer"
            :revert-state="revertState"
            :max-question="lastReachedQuestionNumber"
            :length="totalQuestionsNumber"
            :records="opponent.records.data"
          />
        </template>
        <template #first-section-footer>
          <UiButton
            :disabled="!canSubmit"
            @click="handleSubmit"
            class="py-[6px] text-sm w-[8vmax]"
          >
            SUBMIT
          </UiButton>
        </template>
      </ExamBlock>
    </div>
  </div>

  <Result
    v-if="flags.ingame.isGameFinished"
    mode="Multi"
    :user="user"
    :opponent="opponent"
    :totalQuestionsNumber="totalQuestionsNumber"
  />
</template>
