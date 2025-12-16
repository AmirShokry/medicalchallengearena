import { defineStore } from "pinia";
// import type { ToClientIO } from "@/shared/types/socket";
import type { MatchingSystemCategories, Cases } from "@/shared/types/common";
import { Player } from "@/components/player";
import { ResettableObject } from "@/components/ResettableObject";
import { reactive } from "vue";

export const useGameStore = defineStore("game-store", () => {
  const fatalErrorMessage = ref<string | null>("");
  const mode = ref<"ranked" | "unranked" | "single" | undefined>();
  const gameId = ref<number | undefined>();
  const roomName = ref<string | undefined>();
  const selectableData = reactive(
    ResettableObject({
      systemsCategories: [] as MatchingSystemCategories,
      allCount: 0 as number,
      unusedCount: 0 as number,
      matchingCount: 0 as number,
    })
  );
  const players = reactive(
    ResettableObject({
      user: new Player(),
      opponent: new Player(),
    })
  );

  const flags = reactive({
    matchmaking: {
      ...ResettableObject({
        isFindingMatch: false,
        isMatchFound: false,
        isInviting: false,
        isInvitationSent: false,
        isSelectingUnits: false,
      }),
    },
    ingame: {
      ...ResettableObject({
        isGameStarted: false,
        isGameFinished: false,
        isExplanationVisible: false,
        isReviewingQuestion: false,
      }),
    },
  });

  const data = reactive(
    ResettableObject({
      invitedId: -1,
      cases: [] as Cases,
      // Reconnection progress data (populated by Connection.client.vue on reconnection)
      reconnectionProgress: null as {
        currentCaseIdx: number;
        currentQuestionIdx: number;
        currentQuestionNumber: number;
        hasSolved: boolean;
        opponentHasSolved: boolean;
      } | null,
      // Flag set by Connection.client.vue to indicate fresh reconnection data is ready
      reconnectionDataReady: false,
    })
  );

  function resetEverything() {
    players.user.timer.destroy();
    players.opponent.timer.destroy();

    flags.ingame["~reset"]();
    flags.matchmaking["~reset"]();
    data["~reset"]();
    players.user.flags["~reset"]();
    players.user.records["~reset"]();
    players.opponent.flags["~reset"]();
    players.opponent.records["~reset"]();
    players.opponent.info["~reset"]();
    selectableData["~reset"]();
    mode.value = undefined;
    gameId.value = undefined;
    roomName.value = undefined;
  }

  return {
    // state,
    fatalErrorMessage,
    selectableData,
    mode,
    players,
    data,
    flags,
    gameId,
    roomName,
    "~resetEverything": resetEverything,
  };
});
