<script setup lang="ts">
import MultiPagination from "@/components/exam/pagination/MultiPagination.vue";
import BeforeGameAnimation from "@/components/splash/BeforeGameAnimation.vue";
import ExamBlock from "@/components/ExamBlock/index.vue";
import UserInfo from "@/components/exam/Player.vue";
import OpponentInfo from "@/components/exam/Player.vue";
import Result from "@/components/exam/result/index.vue";
import { gameSocket } from "@/components/socket";
import getGameData from "@/components/exam/index";
import { LogOutIcon as ExitIcon, PauseIcon, PlayIcon } from "lucide-vue-next";
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

onMounted(() => {
  flags.matchmaking["~reset"]();
  user.records["~reset"]();
  opponent.records["~reset"]();
  user.flags.hasAccepted = false;
  opponent.flags.hasAccepted = false;
  flags.ingame.isGameStarted = true;

  gameSocket.on("gamePaused", () => {
    user.timer.pause();
    opponent.timer.pause();
    isPaused.value = true;
  });
  gameSocket.on("gameResumed", () => {
    user.timer.resume();
    opponent.timer.resume();
    isPaused.value = false;
  });
});

const peerApi = usePeer();
peerApi.setStatus("busy");

console.log($$game.players.opponent.info);

const hasAnimationEnded = ref(false),
  hasRecordBeenSent = ref(false);

const isPaused = ref(false);

function togglePause() {
  if (isPaused.value) {
    gameSocket.emit("resumeGame");
    user.timer.resume();
    opponent.timer.resume();
    isPaused.value = false;
  } else {
    gameSocket.emit("pauseGame");
    user.timer.pause();
    opponent.timer.pause();
    isPaused.value = true;
  }
}

function startGame() {
  hasAnimationEnded.value = true;
  user.timer.start({
    mins: 1,
    secs: 30,
    direction: "down",
    timeoutCallback: onTimeOut,
  });
  opponent.timer.start({ mins: 1, secs: 30, direction: "down" });
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
    timeSpentMs: user.timer.getElapseTimeMs(),
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

    user.timer.restart();
    if (!opponent.flags.hasLeft) opponent.timer.restart();

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

function onTimeOut() {
  if (flags.ingame.isReviewingQuestion) revertState();

  user.flags.hasSolved = true;
  user.records.stats.wrongAnswersCount++;

  const recordData = getRecordData({
    medPoints: 0,
    correctOverride: false,
    timeSpentMs: user.timer.getStartingTimeMs(),
  });
  user.records.data.push(recordData);

  audio.incorrect_answer.play();
  gameSocket.emit("userSolved", recordData, user.records.stats);
}

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
    (acc, record) => acc + record.timeSpentMs! || 0,
    0
  );
  if (!hasRecordBeenSent.value) {
    gameSocket.emit("userFinishedGame", $$game.gameId!, user.records);
    hasRecordBeenSent.value = true;
  }
}

function onLeaveGame() {
  $$game["~resetEverything"]();
  user.timer.destroy();
  opponent.timer.destroy();
  gameSocket.emit("userLeft");
  $router.replace({ name: "game-lobby" });
}

onBeforeUnmount(() => {
  if (hasGameEnded.value && !hasRecordBeenSent.value) {
    gameSocket.emit("userFinishedGame", $$game.gameId!, user.records);
    hasRecordBeenSent.value = true;
  }
  gameSocket.off("gamePaused");
  gameSocket.off("gameResumed");
  user.timer.destroy();
  opponent.timer.destroy();
  $$game["~resetEverything"]();
  gameSocket.emit("userLeft");
});
</script>
<template>
  <BeforeGameAnimation v-if="!hasAnimationEnded" @end="startGame" />
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
  <div class="w-full h-full flex flex-col pb-4">
    <div class="flex justify-between mb-3 py-2 px-6">
      <UserInfo
        :username="user.info.username"
        :avatar-url="user.info.avatarUrl!"
        :med-points="user.records.stats.totalMedpoints"
        :time="user.timer.time!"
        :rank="1"
        :status="userStatus"
      />

      <UiButton @click="togglePause" variant="ghost" class="w-24">
        <PlayIcon v-if="isPaused" class="mr-2 h-4 w-4" />
        <PauseIcon v-else class="mr-2 h-4 w-4" />
        {{ isPaused ? "Resume" : "Pause" }}
      </UiButton>

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
        :class="{ 'opacity-50 pointer-events-none': isPaused }"
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
