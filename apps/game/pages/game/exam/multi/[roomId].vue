<script setup lang="ts">
import MultiPagination from "../../../../components/Exam/pagination/MultiPagination.vue";
import UserInfo from "../../../../components/Exam/Player.vue";
import OpponentInfo from "../../../../components/Exam/Player.vue";
import BeforeGameAnimation from "../../../../components/splash/BeforeGameAnimation.vue";
import ExamBlock from "../../../../components/ExamBlock/index.vue";
import Result from "../../../../components/Exam/Result/index.vue";
import { gameSocket } from "../../../../components/socket";
import getGameData from "../../../../components/Exam/index";
import { LogOutIcon as ExitIcon } from "lucide-vue-next";
import useSocial from "@/composables/useSocial";
import { useGameReconnection } from "@/composables/useGameReconnection";

definePageMeta({
  layout: "blank",
  middleware: "exam",
});

const route = useRoute();
const $$game = useGameStore();
const $$user = useUserStore();
const audio = useAudioStore();
const $router = useRouter();

// Get roomId from URL params - decode URI component since it may be encoded
const roomId = computed(() => {
  const raw = (route.params as { roomId?: string }).roomId ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
});

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

// Flag to prevent the advance watchEffect from triggering during state restoration
const isRestoringState = ref(false);

onMounted(() => {
  flags.matchmaking["~reset"]();
  user.records["~reset"]();
  opponent.records["~reset"]();
  user.flags.hasAccepted = false;
  opponent.flags.hasAccepted = false;
  flags.ingame.isGameStarted = true;

  // Store the roomId in game store for reconnection
  $$game.roomName = roomId.value;

  // Setup reconnection listeners
  setupReconnection();

  // Use the pre-computed needsReconnectionAtStart
  let reconnectionTimeout: ReturnType<typeof setTimeout> | null = null;

  // Handle failed game reconnection
  console.log("[Multi] Registering gameReconnectionFailed handler");
  gameSocket.on("gameReconnectionFailed", (data) => {
    console.log(
      "[Multi] *** gameReconnectionFailed handler CALLED ***",
      data.reason
    );
    if (reconnectionTimeout) clearTimeout(reconnectionTimeout);
    isReconnection.value = false;
    hasAnimationEnded.value = false; // Allow animation on next proper game
    // Navigate back to lobby
    $router.push("/game/lobby");
  });

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
  console.log("[Multi] Registering gameSessionRestored handler NOW");
  gameSocket.on("gameSessionRestored", (data) => {
    console.log("[Multi] *** gameSessionRestored handler CALLED ***", data);
    if (reconnectionTimeout) clearTimeout(reconnectionTimeout);

    // Restore user info if provided
    if (data.userInfo) {
      user.info["~set"]({
        id: data.userInfo.id,
        username: data.userInfo.username,
        avatarUrl: data.userInfo.avatarUrl || "",
        medPoints: data.userInfo.medPoints,
        university: data.userInfo.university || "",
      });
      user.flags.isMaster = data.isMaster || false;
    }

    // Restore opponent info if provided
    if (data.opponentInfo) {
      opponent.info["~set"]({
        id: data.opponentInfo.id,
        username: data.opponentInfo.username,
        avatarUrl: data.opponentInfo.avatarUrl || "",
        medPoints: data.opponentInfo.medPoints,
        university: data.opponentInfo.university || "",
      });
      opponent.flags.isMaster = !data.isMaster;
    }

    if (data.gameState) {
      restoreGameState(data.gameState);
      // Update current question position
      current.caseIdx = data.gameState.userProgress.currentCaseIdx;
      current.questionIdx = data.gameState.userProgress.currentQuestionIdx;
      current.questionNumber =
        data.gameState.userProgress.currentQuestionNumber;
      lastReachedQuestionNumber.value =
        data.gameState.userProgress.currentQuestionNumber;

      // Restore user records
      if (data.gameState.userProgress.records) {
        user.records.stats = data.gameState.userProgress.records.stats;
        user.records.data = data.gameState.userProgress.records.data;
      }

      // Restore opponent records
      if (data.gameState.opponentProgress.records) {
        opponent.records.stats = data.gameState.opponentProgress.records.stats;
        opponent.records.data = data.gameState.opponentProgress.records.data;
      }

      // If user had already solved this question, restore that state
      if (data.gameState.userProgress.hasSolved) {
        user.flags.hasSolved = true;
        user.timer.stop();
        canViewAnswer.value = true;
      }

      // If opponent had already solved this question, restore that state
      if (data.gameState.opponentProgress.hasSolved) {
        opponent.flags.hasSolved = true;
        opponent.timer.stop();
      }
    }

    // Mark as reconnection complete and skip animation
    isReconnection.value = false;
    hasAnimationEnded.value = true;
  });

  // NOW request reconnection AFTER all handlers are registered
  if (needsReconnectionAtStart) {
    console.log(
      "[Multi] No game data, requesting reconnection for room:",
      roomId.value
    );
    // isReconnection is already true from initialization

    // Set a timeout for reconnection - if it takes too long, redirect to lobby
    reconnectionTimeout = setTimeout(() => {
      if (isReconnection.value) {
        console.log(
          "[Multi] Reconnection timeout, socket connected:",
          gameSocket.connected
        );
        isReconnection.value = false;
        hasAnimationEnded.value = false; // Reset so animation can play on next game
        $router.push("/game/lobby");
      }
    }, 10000); // 10 second timeout

    // Watch for reconnection data to be ready (set by Connection.client.vue)
    // This flag is only set AFTER all reconnection data is populated
    const stopWatching = watch(
      () => $$game.data.reconnectionDataReady,
      (isReady) => {
        if (isReady && isReconnection.value) {
          console.log("[Multi] Reconnection data ready, applying state");
          if (reconnectionTimeout) clearTimeout(reconnectionTimeout);

          // Reset the flag immediately to prevent re-triggering
          $$game.data.reconnectionDataReady = false;

          // Set flag to prevent watchEffect from triggering during restoration
          isRestoringState.value = true;

          // Restore current question position from reconnection data
          const progress = $$game.data.reconnectionProgress;
          console.log("[Multi] reconnectionProgress:", progress);
          if (progress) {
            console.log("[Multi] Restoring question position:", progress);
            current.caseIdx = progress.currentCaseIdx;
            current.questionIdx = progress.currentQuestionIdx;
            current.questionNumber = progress.currentQuestionNumber;
            lastReachedQuestionNumber.value = progress.currentQuestionNumber;

            if (progress.hasSolved) {
              console.log("[Multi] Restoring user hasSolved = true");
              user.flags.hasSolved = true;
              user.timer.stop();
              canViewAnswer.value = true;
            }

            if (progress.opponentHasSolved) {
              console.log("[Multi] Restoring opponent hasSolved = true");
              opponent.flags.hasSolved = true;
              opponent.timer.stop();
            }

            // Clear reconnection data
            $$game.data.reconnectionProgress = null;
          }

          isReconnection.value = false;
          hasAnimationEnded.value = true;

          // Allow watchEffect to run again after restoration is complete
          nextTick(() => {
            isRestoringState.value = false;
          });

          stopWatching();
        }
      },
      { immediate: true }
    );

    // Wait for socket to be connected before emitting
    const emitReconnectionRequest = () => {
      console.log(
        "[Multi] Emitting requestGameReconnection for room:",
        roomId.value
      );
      gameSocket.emit("requestGameReconnection", roomId.value);
    };

    // Use nextTick to ensure all handlers are definitely registered
    nextTick(() => {
      console.log(
        "[Multi] nextTick: Checking socket state, connected:",
        gameSocket.connected
      );

      if (gameSocket.connected) {
        console.log("[Multi] Socket already connected");
        emitReconnectionRequest();
      } else {
        console.log("[Multi] Waiting for socket connection...");
        // Socket is not connected yet, wait for connect event
        // Also try to connect if not already attempting
        gameSocket.connect();
        gameSocket.once("connect", () => {
          console.log("[Multi] Socket connected event received");
          emitReconnectionRequest();
        });
      }
    });
  }
});

// Set user status to ingame when in game (server should have already set this)
const social = useSocial();
social.setStatus("ingame");

console.log($$game.players.opponent.info);

// Detect if we need reconnection (no cases loaded but we have a roomId)
// Initialize refs based on whether this is a reconnection scenario
const needsReconnectionAtStart = !cases.value?.length && !!roomId.value;

// Track if this is a reconnection - shows "Restoring game..." instead of countdown
const isReconnection = ref(needsReconnectionAtStart);
// Track if animation/loading is complete and game should be shown
// During reconnection, this starts false (showing loading) and becomes true when data loads
// During normal game, this starts false (showing countdown) and becomes true when countdown ends
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
  console.log("[Multi] Emitted userSolved");
}

watchEffect(() => {
  // Skip during state restoration to prevent unwanted advances
  if (isRestoringState.value) {
    console.log("[Multi] watchEffect skipped - isRestoringState is true");
    return;
  }

  console.log("[Multi] watchEffect check:", {
    userHasSolved: user.flags.hasSolved,
    opponentHasSolved: opponent.flags.hasSolved,
    opponentHasLeft: opponent.flags.hasLeft,
  });

  if (
    user.flags.hasSolved &&
    (opponent.flags.hasLeft || opponent.flags.hasSolved)
  ) {
    console.log("[Multi] Both solved! Advancing to next question...");
    opponent.flags.hasSolved = false;
    user.flags.hasSolved = false;

    revertState();
    window.scrollTo(0, 0);

    if (hasGameEnded.value) return endGame();

    // Both players emit advanceQuestion - server will deduplicate and only advance once
    gameSocket.emit("advanceQuestion");

    function advanceQuestion() {
      flags.ingame.isReviewingQuestion = false;
      current.questionNumber++;
      lastReachedQuestionNumber.value++;

      if (
        current.questionIdx + 1 <
        cases.value?.[current?.caseIdx]?.questions?.length!
      )
        return current.questionIdx++;

      current.caseIdx++;
      current.questionIdx = 0;
    }

    advanceQuestion();
  }
});

gameSocket.on("opponentSolved", (data, stats) => {
  console.log("[Multi] *** opponentSolved received ***", data);
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
      $$user.user.questionsTotal! += totalQuestionsNumber.value;
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
  gameSocket.off("gameReconnectionFailed");
  user.timer.destroy();
  opponent.timer.destroy();
  $$game["~resetEverything"]();
  gameSocket.emit("userLeft");
  // Set status back to online when leaving the game
  social.setStatus("online");
});
</script>
<template>
  <!-- Loading state while waiting for reconnection data -->
  <div
    v-if="isReconnection && !hasAnimationEnded"
    class="fixed inset-0 bg-background z-50 flex items-center justify-center"
  >
    <div class="text-center">
      <div
        class="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
      ></div>
      <p class="text-xl font-semibold">Restoring game...</p>
      <p class="text-sm text-muted-foreground mt-2">
        Please wait while we restore your session
      </p>
    </div>
  </div>

  <BeforeGameAnimation v-else-if="!hasAnimationEnded" @end="startGame" />

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
