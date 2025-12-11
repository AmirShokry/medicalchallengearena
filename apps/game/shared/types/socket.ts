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
      /** Opponent temporarily disconnected (ping timeout, transport close) - may reconnect */
      opponentDisconnected: (data: { reason: string }) => void;
      /** Opponent reconnected after temporary disconnect */
      opponentReconnected: () => void;
      /** Game session restored after reconnection */
      gameSessionRestored: (data: {
        roomName: string;
        gameId: number;
        opponentConnected: boolean;
      }) => void;
      gameStarted: (data: { cases: Cases; gameId: number }) => void;
      opponentSolved: (
        data: RecordObject["data"][0],
        stats: RecordObject["stats"]
      ) => void;
      opponentAccepted: (data: { isMaster: boolean }) => void;
      opponentSentInvitation: (data: { friendId: number }) => void;
      gamePaused: () => void;
      gameResumed: (data: {
        serverTime: number;
        startTimestamp: number | null;
        remainingMs: number | null;
      }) => void;
      /** Server-authoritative timer: question started with timestamp */
      questionStarted: (data: {
        serverTime: number;
        startTimestamp: number;
        durationMs: number;
      }) => void;
      /** Invitation validation response */
      invitationValidated: (data: {
        canInvite: boolean;
        reason?: string;
      }) => void;
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
      /** True if this socket was opened while user already has another tab in a game */
      isSecondaryTab?: boolean;
    }
  }
  export namespace Social {
    /** Friend message structure */
    export interface FriendMessage {
      id: number;
      senderId: number;
      senderUsername: string;
      receiverId?: number;
      content: string;
      createdAt: Date;
      isRead: boolean;
    }

    /** User status type */
    export type UserStatus =
      | "online"
      | "offline"
      | "busy"
      | "matchmaking"
      | "ingame";

    export interface Events extends Default.Events {
      /** Legacy chat event (deprecated) */
      receiveChat: (data: { id: number; content: string }) => void;
      /** Friend status update notification */
      friendStatusUpdate: (data: {
        id: number;
        username: string;
        status: UserStatus;
      }) => void;
      receivedFriendRequest: (data: PlayerData) => void;
      rejectedFriendRequest: (data: { id: number }) => void;
      /** Receive a friend message */
      receiveFriendMessage: (message: FriendMessage) => void;
      /** Notification that messages were read by recipient */
      messagesRead: (data: { readBy: number }) => void;
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
    ) => Map<number, ToClientIO.Social.UserStatus>;
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
        target: "pool" | "category" | "questionsCount" | "allSystems";
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
      pauseGame: () => void;
      resumeGame: () => void;
      /** Server-authoritative timer: request to start question timer */
      startQuestionTimer: () => void;
      /** Server-authoritative timer: request to advance to next question */
      advanceQuestion: () => void;
      /** Request current server time for sync */
      requestTimeSync: (
        callback: (data: {
          serverTime: number;
          questionStartTimestamp: number | null;
          questionDurationMs: number | null;
          isPaused: boolean;
        }) => void
      ) => void;
      /** Check if a user can be invited to a game */
      checkCanInvite: (
        userId: number,
        callback: (result: {
          canInvite: boolean;
          reason?: string;
          status: string;
        }) => void
      ) => void;
    }
  }

  export namespace Social {
    /** User status type for presence */
    export type UserStatus =
      | "online"
      | "offline"
      | "busy"
      | "matchmaking"
      | "ingame";

    export interface Events extends Default.Events {
      /** Legacy chat event (deprecated - use sendFriendMessage) */
      sendChat: (data: { id: number; content: string }) => void;
      /** Open chat with a friend - marks messages as read and retrieves history */
      openChat: (
        data: { id: number },
        callback?: (messages: ToClientIO.Social.FriendMessage[]) => void
      ) => void;
      /** Get status of multiple friends */
      getFriendsStatus: (
        data: number[],
        cb: (statuses: Record<number, ToClientIO.Social.UserStatus>) => void
      ) => void;
      friendRequestSent: (data: { id: number }) => void;
      /** Update current user's status */
      updateStatus: (status: UserStatus) => void;
      /** Check if a specific user is online */
      checkUserOnline: (
        userId: number,
        callback: (
          isOnline: boolean,
          status: ToClientIO.Social.UserStatus
        ) => void
      ) => void;
      /** Send a message to a friend (stored in database) */
      sendFriendMessage: (
        data: { friendId: number; content: string },
        callback?: (result: {
          success: boolean;
          messageId?: number;
          error?: string;
        }) => void
      ) => void;
      /** Get conversation history with a friend */
      getConversationHistory: (
        data: { friendId: number; limit?: number; offset?: number },
        callback: (messages: ToClientIO.Social.FriendMessage[]) => void
      ) => void;
      /** Mark messages from a friend as read */
      markMessagesRead: (friendId: number) => void;
      /** Get unread message counts from all friends */
      getUnreadCounts: (
        callback: (counts: Record<number, number>) => void
      ) => void;
    }
  }

  export namespace Default {
    export interface Events {
      leaveAll: () => void;
      /** Keep-alive ping to prevent Cloudflare from dropping idle connections */
      ping: () => void;
    }
    export interface Data {
      session: AnyUser & DefaultSession["user"];
    }
  }
}

export {};
