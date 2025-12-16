/**
 * @fileoverview Game State Manager for Reconnection Support
 *
 * This module manages in-memory game state for active multiplayer games,
 * enabling users to reconnect and restore their game progress after
 * temporary disconnections (e.g., browser tab minimization, network issues).
 *
 * Key Features:
 * - Stores game cases data for each active game
 * - Tracks player progress (current question, answers, stats)
 * - Tracks player connection status (connected, disconnected, away)
 * - Supports graceful reconnection without kicking players
 * - Auto-cleanup when games end or timeout
 *
 * Important: This is in-memory storage. In production, consider using Redis
 * for persistence across server restarts.
 */

import type { Cases, RecordObject } from "@/shared/types/common";

/**
 * Player info for reconnection
 */
export interface PlayerInfo {
  id: number;
  username: string;
  avatarUrl: string | null;
  medPoints: number;
  university: string | null;
}

/**
 * Player progress state within a game
 */
export interface PlayerProgress {
  /** Current case index (0-based) */
  currentCaseIdx: number;
  /** Current question index within the case (0-based) */
  currentQuestionIdx: number;
  /** Current question number (1-based, flat across all cases) */
  currentQuestionNumber: number;
  /** Player's answer records and stats */
  records: RecordObject;
  /** Whether player has solved current question */
  hasSolved: boolean;
  /** Last activity timestamp */
  lastActivityAt: number;
}

/**
 * Player connection state
 */
export type PlayerConnectionState = "connected" | "disconnected" | "away";

/**
 * Full game state for an active game
 */
export interface GameState {
  /** Unique game ID from database */
  gameId: number;
  /** Socket.IO room name */
  roomName: string;
  /** Cases data for the game */
  cases: Cases;
  /** Player 1 user ID */
  player1Id: number;
  /** Player 2 user ID */
  player2Id: number;
  /** Player 1 info */
  player1Info: PlayerInfo;
  /** Player 2 info */
  player2Info: PlayerInfo;
  /** Player 1 progress */
  player1Progress: PlayerProgress;
  /** Player 2 progress */
  player2Progress: PlayerProgress;
  /** Player 1 connection state */
  player1ConnectionState: PlayerConnectionState;
  /** Player 2 connection state */
  player2ConnectionState: PlayerConnectionState;
  /** Which player is master (true = player1, false = player2) */
  player1IsMaster: boolean;
  /** Game creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Map of active game states
 * Key: roomName, Value: GameState
 */
const activeGameStates = new Map<string, GameState>();

/**
 * Map of user IDs to their active room names for quick lookup
 * Key: userId, Value: roomName
 */
const userToRoomMap = new Map<number, string>();

/**
 * Creates initial empty progress for a player
 */
function createEmptyProgress(): PlayerProgress {
  return {
    currentCaseIdx: 0,
    currentQuestionIdx: 0,
    currentQuestionNumber: 1,
    records: {
      stats: {
        correctAnswersCount: 0,
        wrongAnswersCount: 0,
        correctEliminationsCount: 0,
        wrongEliminationsCount: 0,
        totalMedpoints: 0,
        totalTimeSpentMs: 0,
      },
      data: [],
    },
    hasSolved: false,
    lastActivityAt: Date.now(),
  };
}

/**
 * Initializes a new game state when a game starts
 */
export function initializeGameState(
  roomName: string,
  gameId: number,
  player1Id: number,
  player2Id: number,
  player1Info: PlayerInfo,
  player2Info: PlayerInfo,
  cases: Cases,
  player1IsMaster: boolean = true
): GameState {
  const now = Date.now();

  const gameState: GameState = {
    gameId,
    roomName,
    cases,
    player1Id,
    player2Id,
    player1Info,
    player2Info,
    player1Progress: createEmptyProgress(),
    player2Progress: createEmptyProgress(),
    player1ConnectionState: "connected",
    player2ConnectionState: "connected",
    player1IsMaster,
    createdAt: now,
    updatedAt: now,
  };

  activeGameStates.set(roomName, gameState);
  userToRoomMap.set(player1Id, roomName);
  userToRoomMap.set(player2Id, roomName);

  console.log(
    `[GameStateManager] Initialized game state for room ${roomName} (game ${gameId})`
  );

  return gameState;
}

/**
 * Gets the game state for a room
 */
export function getGameState(roomName: string): GameState | undefined {
  return activeGameStates.get(roomName);
}

/**
 * Finds the game state by user ID
 */
export function findGameStateByUserId(
  userId: number
): { roomName: string; gameState: GameState } | undefined {
  const roomName = userToRoomMap.get(userId);
  if (!roomName) return undefined;

  const gameState = activeGameStates.get(roomName);
  if (!gameState) {
    // Cleanup stale mapping
    userToRoomMap.delete(userId);
    return undefined;
  }

  return { roomName, gameState };
}

/**
 * Gets the player progress for a specific user
 */
export function getPlayerProgress(
  roomName: string,
  userId: number
): PlayerProgress | undefined {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return undefined;

  if (gameState.player1Id === userId) return gameState.player1Progress;
  if (gameState.player2Id === userId) return gameState.player2Progress;
  return undefined;
}

/**
 * Gets the opponent's progress for a specific user
 */
export function getOpponentProgress(
  roomName: string,
  userId: number
): PlayerProgress | undefined {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return undefined;

  if (gameState.player1Id === userId) return gameState.player2Progress;
  if (gameState.player2Id === userId) return gameState.player1Progress;
  return undefined;
}

/**
 * Updates a player's progress after solving a question
 */
export function updatePlayerProgress(
  roomName: string,
  userId: number,
  progress: Partial<PlayerProgress>
): void {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return;

  const isPlayer1 = gameState.player1Id === userId;
  const playerProgress = isPlayer1
    ? gameState.player1Progress
    : gameState.player2Progress;

  Object.assign(playerProgress, progress, {
    lastActivityAt: Date.now(),
  });

  gameState.updatedAt = Date.now();

  console.log(
    `[GameStateManager] Updated progress for user ${userId} in room ${roomName}`
  );
}

/**
 * Updates a player's records after solving a question
 */
export function updatePlayerRecords(
  roomName: string,
  userId: number,
  recordData: RecordObject["data"][0],
  stats: RecordObject["stats"]
): void {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return;

  const isPlayer1 = gameState.player1Id === userId;
  const playerProgress = isPlayer1
    ? gameState.player1Progress
    : gameState.player2Progress;

  playerProgress.records.data.push(recordData);
  playerProgress.records.stats = { ...stats };
  playerProgress.hasSolved = true;
  playerProgress.lastActivityAt = Date.now();
  gameState.updatedAt = Date.now();

  console.log(
    `[GameStateManager] Updated records for user ${userId} in room ${roomName}, question ${playerProgress.records.data.length}`
  );
}

/**
 * Advances to next question for both players
 * Returns true if advanced, false if already at the next question (prevents double-advance)
 */
export function advanceQuestion(roomName: string): boolean {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return false;

  // Check if both players have solved the current question
  // If not, we shouldn't advance yet (prevents premature advancement)
  // Note: This also prevents double-advance since hasSolved is reset after advance
  if (
    !gameState.player1Progress.hasSolved &&
    !gameState.player2Progress.hasSolved
  ) {
    // Both already reset - this is a duplicate call, ignore it
    console.log(
      `[GameStateManager] Ignoring duplicate advanceQuestion for room ${roomName} - already advanced`
    );
    return false;
  }

  // Reset hasSolved for both players
  gameState.player1Progress.hasSolved = false;
  gameState.player2Progress.hasSolved = false;

  // Calculate next question indexes
  const cases = gameState.cases;
  const currentProgress = gameState.player1Progress; // Both should be in sync

  let nextCaseIdx = currentProgress.currentCaseIdx;
  let nextQuestionIdx = currentProgress.currentQuestionIdx + 1;
  let nextQuestionNumber = currentProgress.currentQuestionNumber + 1;

  // Check if we need to move to next case
  if (nextQuestionIdx >= cases[nextCaseIdx]?.questions.length) {
    nextCaseIdx++;
    nextQuestionIdx = 0;
  }

  // Update both players
  gameState.player1Progress.currentCaseIdx = nextCaseIdx;
  gameState.player1Progress.currentQuestionIdx = nextQuestionIdx;
  gameState.player1Progress.currentQuestionNumber = nextQuestionNumber;

  gameState.player2Progress.currentCaseIdx = nextCaseIdx;
  gameState.player2Progress.currentQuestionIdx = nextQuestionIdx;
  gameState.player2Progress.currentQuestionNumber = nextQuestionNumber;

  gameState.updatedAt = Date.now();

  console.log(
    `[GameStateManager] Advanced to question ${nextQuestionNumber} in room ${roomName}`
  );

  return true;
}

/**
 * Updates a player's connection state
 */
export function updatePlayerConnectionState(
  roomName: string,
  userId: number,
  state: PlayerConnectionState
): void {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return;

  if (gameState.player1Id === userId) {
    gameState.player1ConnectionState = state;
  } else if (gameState.player2Id === userId) {
    gameState.player2ConnectionState = state;
  }

  gameState.updatedAt = Date.now();

  console.log(
    `[GameStateManager] Updated connection state for user ${userId} to ${state} in room ${roomName}`
  );
}

/**
 * Gets a player's connection state
 */
export function getPlayerConnectionState(
  roomName: string,
  userId: number
): PlayerConnectionState | undefined {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return undefined;

  if (gameState.player1Id === userId) return gameState.player1ConnectionState;
  if (gameState.player2Id === userId) return gameState.player2ConnectionState;
  return undefined;
}

/**
 * Gets opponent's user ID
 */
export function getOpponentId(
  roomName: string,
  userId: number
): number | undefined {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return undefined;

  if (gameState.player1Id === userId) return gameState.player2Id;
  if (gameState.player2Id === userId) return gameState.player1Id;
  return undefined;
}

/**
 * Cleans up game state when a game ends
 */
export function cleanupGameState(roomName: string): void {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return;

  userToRoomMap.delete(gameState.player1Id);
  userToRoomMap.delete(gameState.player2Id);
  activeGameStates.delete(roomName);

  console.log(`[GameStateManager] Cleaned up game state for room ${roomName}`);
}

/**
 * Gets full game state for reconnection restoration
 */
export function getFullGameStateForReconnection(
  roomName: string,
  userId: number
):
  | {
      cases: Cases;
      userProgress: PlayerProgress;
      opponentProgress: PlayerProgress;
    }
  | undefined {
  const gameState = activeGameStates.get(roomName);
  if (!gameState) return undefined;

  const isPlayer1 = gameState.player1Id === userId;

  return {
    cases: gameState.cases,
    userProgress: isPlayer1
      ? gameState.player1Progress
      : gameState.player2Progress,
    opponentProgress: isPlayer1
      ? gameState.player2Progress
      : gameState.player1Progress,
  };
}

/**
 * Checks if a user has an active game
 */
export function hasActiveGame(userId: number): boolean {
  return userToRoomMap.has(userId);
}

/**
 * Gets all active game states (for debugging)
 */
export function getAllActiveGames(): Map<string, GameState> {
  return new Map(activeGameStates);
}

/**
 * Cleanup stale games (games older than specified hours)
 * Should be called periodically
 */
export function cleanupStaleGames(maxAgeHours: number = 4): void {
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  for (const [roomName, gameState] of activeGameStates.entries()) {
    if (now - gameState.updatedAt > maxAge) {
      console.log(
        `[GameStateManager] Cleaning up stale game in room ${roomName}`
      );
      cleanupGameState(roomName);
    }
  }
}
