import type {
  AnyUser,
  PlayerData,
  Cases,
  MatchingSystemCategories,
  DefaultSession,
  RecordObject,
} from "./common";
import type { Namespace, Socket } from "socket.io";
export type SocialIO = Namespace<
  ToServerIO.Social.Events,
  ToClientIO.Social.Events,
  any,
  ToClientIO.Social.Data
> &
  SocialIOHelpers;
export type SocialSocket = Socket<
  ToServerIO.Social.Events,
  ToClientIO.Social.Events,
  any,
  ToClientIO.Social.Data
>;
export type GameSocket = Socket<
  ToServerIO.Game.Events,
  ToClientIO.Game.Events,
  any,
  ToClientIO.Game.Data
>;
export type GameIO = Namespace<
  ToServerIO.Game.Events,
  ToClientIO.Game.Events,
  any,
  ToClientIO.Game.Data
>;
export namespace ToClientIO {
  export namespace Game {
    export interface Events extends Default.Events {
      matchFound: (data: { opponent: PlayerData }) => void;
      opponentSelected: (data: {
        target:
          | "pool"
          | "system"
          | "category"
          | "questionsCount"
          | "allSystems";
        pool?: "all" | "unused";
        sysIndex?: number;
        catIndex?: number;
        questionsCount?: number;
      }) => void;
      opponentSentSelectionChat: (data: string) => void;
      opponentDeclined: () => void;
      opponentLeft: () => void;
      gameStarted: (data: { cases: Cases; gameId: number }) => void;
      opponentSolved: (
        data: RecordObject["data"][0],
        stats: RecordObject["stats"]
      ) => void;
      opponentAccepted: (data: {
        isMaster: boolean;
        allCount: number;
        unusedCount: number;
        matchingCount: number;
        systemsCategories: MatchingSystemCategories;
      }) => void;
      opponentSentInvitation: (data: { friendId: number }) => void;
    }
    export interface Data extends Default.Data {
      hasAccepted: boolean;
      hasOpponentLeft: boolean;
      roomName: string;
      opponentSocket:
        | import("socket.io").Socket<
            ToServerIO.Game.Events,
            ToClientIO.Game.Events,
            any,
            ToClientIO.Game.Data
          >
        | undefined;
      isInGame: boolean;
      isInStudyMode: boolean;
      isMaster: boolean;
      hasSolved: boolean;
      finalStats: { totalMedpoints: number; totalTimeSpentMs: number };
    }
  }
  export namespace Social {
    export interface Events extends Default.Events {
      receiveChat: (data: { id: number; content: string }) => void;
      friendStatusUpdate: (data: {
        id: number;
        username: string;
        status: "online" | "offline" | "ingame";
      }) => void;
      receivedFriendRequest: (data: PlayerData) => void;
      rejectedFriendRequest: (data: { id: number }) => void;
    }

    export interface Data extends Default.Data {}
  }
  export namespace Default {
    export interface Events {
      error: (err: Error) => void;
    }
    export interface Data {
      session: AnyUser & DefaultSession["user"];
    }
  }
}
type SocialIOHelpers = {
  helpers: {
    /**
     *
     * @description Get the friend status of a group of users
     * @param id Target friends ids
     */
    getUsersStatusById: (
      usersIds: number[]
    ) => Map<number, "online" | "offline" | "ingame">;
  };
};
declare module "socket.io" {
  interface Socket {
    helpers: {
      reset(): void;
    };
  }
  interface Server {
    helpers: {
      getOpponentSocketId(socketId: string): string | undefined;
      isInGame(socketId: string): boolean | undefined;
    };
  }
}

// import type { RecordObject } from "#/types";
export namespace ToServerIO {
  export namespace Game {
    export interface Events extends Default.Events {
      challenge: (data: { mode: "RANKED" | "UNRANKED" }) => void;
      userAccepted: (isInvitation?: boolean) => void;
      userSolved: (
        data: RecordObject["data"][0],
        stats: RecordObject["stats"]
      ) => void;
      userSelected: (data: {
        target:
          | "pool"
          | "system"
          | "category"
          | "questionsCount"
          | "allSystems";
        pool?: "all" | "unused";
        sysIndex?: number;
        catIndex?: number;
        questionsCount?: number;
      }) => void;
      userSentSelectionChat: (data: string) => void;
      userStartedGame: (data: {
        pool: "all" | "unused";
        casesCount: number;
        selectedCatIds: number[];
      }) => void;

      userFinishedGame: (gameId: number, data: RecordObject) => void;
      userDeclined: () => void;
      userLeft: () => void;
      userSentInvitation: (data: { id: number }) => void;
      userJoinedWaitingRoom: () => void;
    }
  }

  export namespace Social {
    export interface Events extends Default.Events {
      sendChat: (data: { id: number; content: string }) => void;
      openChat: (data: { id: number }) => void;
      getFriendsStatus: (
        data: number[],
        cb: (statuses: Record<number, "online" | "offline" | "ingame">) => void
      ) => void;
      friendRequestSent: (data: { id: number }) => void;
    }
  }

  export namespace Default {
    export interface Events {
      leaveAll: () => void;
    }
    export interface Data {
      session: AnyUser & DefaultSession["user"];
    }
  }
}

export {};
