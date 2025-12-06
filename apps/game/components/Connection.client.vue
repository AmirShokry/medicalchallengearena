<script setup lang="ts">
import { gameSocket, socialSocket } from "./socket";

const isConnected = ref(false);

const transport = ref("N/A");
const $$game = useGameStore();
const friendStore = useFriendsStore();
const matchmaking = useMatchMakingStore();
const audio = useAudioStore();
const $router = useRouter();
const { status } = useAuth();

const friendList = computed(() => friendStore.friendList);

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
    console.log("User signed in, reconnecting sockets...");
    connectSockets();
  }
});

function connectSockets() {
  socialSocket.off();
  gameSocket.off();
  gameSocket.connect();
  socialSocket.connect();

  setupSocketListeners();
}

function setupSocketListeners() {
  gameSocket.on("matchFound", (data) => {
    $$game.players.opponent.info["~set"](data.opponent);
    $$game.flags.matchmaking.isMatchFound = true;
    matchmaking.state = "reviewing-invitation";
    $$game.flags.matchmaking.isFindingMatch = false;
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
  });

  gameSocket.on("opponentLeft", () => {
    // console.log("opponentLef");
    if (!$$game.flags.ingame.isGameStarted) {
      if ($router.currentRoute.value.name === "game-exam-multi") {
        matchmaking.state = "idle";
        $router.replace({ name: "game-setup-multi" });
      }
      gameSocket.emit("userDeclined");
      return $$game["~resetEverything"]();
    }

    $$game.players.opponent.flags["~reset"]();
    $$game.players.opponent.flags.hasLeft = true;
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
    $$game.players.user.flags.isInvited = true;
  });

  gameSocket.on("gameStarted", (data) => {
    $$game.data.cases = data.cases;
    $$game.flags.ingame.isGameStarted = true;
    $$game.gameId = data.gameId;
    $router.push({ name: "game-exam-multi" });
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

gameSocket.on("opponentSelected", (data) => {
  console.log("Opponent selected:", data);
});

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
