<script setup lang="ts">
import { gameSocket, socialSocket } from "./socket";
import useSocial from "@/composables/useSocial";

const isConnected = ref(false);

const transport = ref("N/A");
const $$game = useGameStore();
const friendStore = useFriendsStore();
const matchmaking = useMatchMakingStore();
const audio = useAudioStore();
const $router = useRouter();
const { status } = useAuth();
const social = useSocial();

const friendList = computed(() => friendStore.friendList);

// Track if we've already set up our listeners to avoid duplicates
let connectionListenersSetUp = false;

if (gameSocket.connected) onConnect();

if (status.value === "authenticated") connectSockets();

function onConnect() {
  isConnected.value = true;
  transport.value = gameSocket.io.engine.transport.name;
  gameSocket.io.engine.on(
    "upgrade",
    (rawTransport) => (transport.value = rawTransport.name)
  );
}

function onDisconnect() {
  isConnected.value = false;
  transport.value = "N/A";
}

/**
 * Handle visibility change to ensure sockets stay connected when tab becomes visible.
 * Browsers may throttle or disconnect WebSocket connections when the tab is minimized.
 */
function handleVisibilityChange() {
  if (
    document.visibilityState === "visible" &&
    status.value === "authenticated"
  ) {
    // Check if sockets need reconnecting when tab becomes visible
    if (!gameSocket.connected) {
      console.log("Tab visible - reconnecting game socket...");
      gameSocket.connect();
    }
    if (!socialSocket.connected) {
      console.log("Tab visible - reconnecting social socket...");
      socialSocket.connect();
    }
  }
}

// Set up visibility change listener
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

gameSocket.on("connect", onConnect);
gameSocket.on("disconnect", onDisconnect);

watch(status, (newStatus, oldStatus) => {
  if (oldStatus === "authenticated" && newStatus !== "authenticated") {
    console.log("User signed out, disconnecting sockets...");
    gameSocket.disconnect();
    socialSocket.disconnect();
  } else if (oldStatus !== "authenticated" && newStatus === "authenticated") {
    console.log("User signed in, connecting sockets...");
    connectSockets();
  }
});

function connectSockets() {
  // Don't call gameSocket.off() here - it removes ALL handlers including
  // those registered by page components like [roomId].vue!
  // Only disconnect and reconnect if needed
  if (!gameSocket.connected) {
    gameSocket.connect();
  }
  if (!socialSocket.connected) {
    socialSocket.connect();
  }

  // Only set up our listeners once to avoid duplicates
  if (!connectionListenersSetUp) {
    setupSocketListeners();
    connectionListenersSetUp = true;
  }
}

function setupSocketListeners() {
  gameSocket.on("matchFound", (data) => {
    $$game.players.opponent.info["~set"](data.opponent);
    $$game.flags.matchmaking.isMatchFound = true;
    matchmaking.state = "reviewing-invitation";
    $$game.flags.matchmaking.isFindingMatch = false;
    // Set status to busy when matched with an opponent
    social.setStatus("busy");
  });

  gameSocket.on("opponentAccepted", (data) => {
    const { isMaster } = data;
    $$game.players.user.flags.isMaster = isMaster;
    matchmaking.state = "selecting-block";
    $$game.flags.matchmaking.isSelectingUnits = true;
  });

  gameSocket.on("opponentDeclined", () => {
    $$game["~resetEverything"]();
    $$game.players.opponent.flags.hasDeclined = true;
    matchmaking.state = "idle";
    // Reset status to matchmaking when opponent declines (user is still on multi setup page)
    social.setStatus("matchmaking");
  });

  gameSocket.on("opponentLeft", () => {
    if (!$$game.flags.ingame.isGameStarted) {
      // Check if on game page (new room-based route)
      const currentPath = $router.currentRoute.value.path;
      if (currentPath.startsWith("/game/exam/multi/")) {
        matchmaking.state = "idle";
        $router.replace({ name: "game-setup-multi" });
      }
      if (matchmaking.state === "selecting-block") {
        matchmaking.state = "idle";
        window.location.reload();
      }
      gameSocket.emit("userDeclined");
      return $$game["~resetEverything"]();
    }

    $$game.players.opponent.flags["~reset"]();
    $$game.players.opponent.flags.hasLeft = true;
  });

  // Handle opponent temporary disconnect (may reconnect)
  gameSocket.on("opponentDisconnected", (data) => {
    console.log(
      `[Game] Opponent disconnected: ${data.reason}. Waiting for reconnection...`
    );
    // Don't set hasLeft yet, give opponent a chance to reconnect
    // We could show a "Opponent reconnecting..." UI indicator here
  });

  // Handle opponent reconnection after temporary disconnect
  gameSocket.on("opponentReconnected", () => {
    console.log("[Game] Opponent reconnected!");
    // Opponent is back, game can continue normally
    // Reset any "reconnecting" UI indicator if we had one
  });

  // Handle game session restored after our own reconnection
  gameSocket.on("gameSessionRestored", (data) => {
    console.log(
      `[Connection] *** gameSessionRestored handler CALLED *** roomName: ${data.roomName}, gameId: ${data.gameId}, opponentConnected: ${data.opponentConnected}`
    );

    // Store the room info
    $$game.gameId = data.gameId;
    $$game.roomName = data.roomName;
    $$game.flags.ingame.isGameStarted = true;

    // Restore user info
    if (data.userInfo) {
      $$game.players.user.info["~set"]({
        id: data.userInfo.id,
        username: data.userInfo.username,
        avatarUrl: data.userInfo.avatarUrl || "",
        medPoints: data.userInfo.medPoints,
        university: data.userInfo.university || "",
      });
      $$game.players.user.flags.isMaster = data.isMaster || false;
    }

    // Restore opponent info
    if (data.opponentInfo) {
      $$game.players.opponent.info["~set"]({
        id: data.opponentInfo.id,
        username: data.opponentInfo.username,
        avatarUrl: data.opponentInfo.avatarUrl || "",
        medPoints: data.opponentInfo.medPoints,
        university: data.opponentInfo.university || "",
      });
      $$game.players.opponent.flags.isMaster = !data.isMaster;
    }

    // Restore current question position BEFORE cases
    // (because [roomId].vue watches cases and reads reconnectionProgress)
    if (data.gameState?.userProgress) {
      console.log("[Connection] Setting reconnectionProgress:", {
        userHasSolved: data.gameState.userProgress.hasSolved,
        opponentHasSolved: data.gameState.opponentProgress?.hasSolved,
      });
      $$game.data.reconnectionProgress = {
        currentCaseIdx: data.gameState.userProgress.currentCaseIdx,
        currentQuestionIdx: data.gameState.userProgress.currentQuestionIdx,
        currentQuestionNumber:
          data.gameState.userProgress.currentQuestionNumber,
        hasSolved: data.gameState.userProgress.hasSolved ?? false,
        opponentHasSolved: data.gameState.opponentProgress?.hasSolved ?? false,
      };
    }

    // Restore user records if provided
    if (data.gameState?.userProgress?.records) {
      $$game.players.user.records.stats =
        data.gameState.userProgress.records.stats;
      $$game.players.user.records.data =
        data.gameState.userProgress.records.data;
    }

    // Restore opponent records if provided
    if (data.gameState?.opponentProgress?.records) {
      $$game.players.opponent.records.stats =
        data.gameState.opponentProgress.records.stats;
      $$game.players.opponent.records.data =
        data.gameState.opponentProgress.records.data;
    }

    // Restore cases
    if (data.gameState?.cases) {
      $$game.data.cases = data.gameState.cases;
    }

    // Set flag to indicate reconnection data is ready
    // [roomId].vue watches this flag to know when to apply the data
    $$game.data.reconnectionDataReady = true;
    console.log("[Connection] Reconnection data ready, flag set");

    // Navigate to the game page if not already there
    const currentRoute = $router.currentRoute.value;
    const encodedRoomName = encodeURIComponent(data.roomName);
    const expectedPath = `/game/exam/multi/${encodedRoomName}`;
    const isOnGamePage =
      currentRoute.path === expectedPath ||
      currentRoute.path === `/game/exam/multi/${data.roomName}`;

    console.log("[Connection] Navigation check:", {
      currentPath: currentRoute.path,
      expectedPath,
      isOnGamePage,
    });

    if (!isOnGamePage) {
      console.log("[Connection] Navigating to game page for reconnection");
      $router.push(expectedPath);
    } else {
      console.log("[Connection] Already on game page, no navigation needed");
    }
  });

  gameSocket.on("opponentSentInvitation", (data) => {
    const opponent = friendList.value?.find(
      (friend) => friend.id === data.friendId
    );
    if (!opponent) return;
    audio.find_match.play();
    $$game.players.opponent.info["~set"]({
      id: opponent.id,
      username: opponent.username,
      medPoints: opponent.medPoints ?? 0,
      avatarUrl: opponent.avatarUrl,
      university: opponent.university,
    });
    // Stop any random matchmaking queue on receipt of an invitation
    $$game.flags.matchmaking.isFindingMatch = false;
    $$game.flags.matchmaking.isInvitationSent = false;
    $$game.flags.matchmaking.isInviting = false;
    $$game.players.user.flags.isInvited = true;
    // Set status to busy when receiving an invitation
    social.setStatus("busy");
  });

  // When our invitation is declined, ensure invite dialog closes (state reset already happens)
  gameSocket.on("opponentDeclined", () => {
    $$game.flags.matchmaking.isInviting = false;
  });

  gameSocket.on("gameStarted", (data) => {
    $$game.data.cases = data.cases;
    $$game.flags.ingame.isGameStarted = true;
    $$game.gameId = data.gameId;
    $$game.roomName = data.roomName;
    // Navigate to room-specific URL for reconnection support
    $router.push(`/game/exam/multi/${encodeURIComponent(data.roomName)}`);
  });

  // Handle invitation validation failures
  gameSocket.on("invitationValidated", (data) => {
    if (!data.canInvite) {
      console.log("Invitation validation failed:", data.reason);
      $$game.flags.matchmaking.isInvitationSent = false;
      $$game["~resetEverything"]();
    }
  });

  // Handle authentication errors by disconnecting
  gameSocket.on("connect_error", (error) => {
    console.log("Game socket connection error:", error);
    $$game.fatalErrorMessage = error.message;
    if (
      error.message === "Authentication required" ||
      error.message === "Authentication failed"
    ) {
      gameSocket.disconnect();
    }
  });

  socialSocket.on("connect_error", (error) => {
    console.log("Social socket connection error:", error);
    if (
      error.message === "Authentication required" ||
      error.message === "Authentication failed"
    ) {
      socialSocket.disconnect();
    }
  });

  gameSocket.on("error", (error) => {
    console.log("Game socket error:", error);
    $$game.fatalErrorMessage = error.message;
    if (
      error.message === "Authentication required" ||
      error.message === "Authentication failed"
    ) {
      gameSocket.disconnect();
    }
  });

  socialSocket.on("error", (error) => {
    console.log("Social socket error:", error);
    if (
      error.message === "Authentication required" ||
      error.message === "Authentication failed"
    ) {
      socialSocket.disconnect();
    }
  });
}

onBeforeUnmount(() => {
  gameSocket.off("connect", onConnect);
  gameSocket.off("disconnect", onDisconnect);
  gameSocket.disconnect();
  socialSocket.disconnect();

  // Clean up visibility listener
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }
});
</script>
<template>
  <slot />
</template>
