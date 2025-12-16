<script setup lang="ts">
/**
 * Legacy route - redirects to new room-based route
 * This page exists for backwards compatibility.
 * New games should navigate to /game/exam/multi/:roomId
 */
definePageMeta({
  layout: "blank",
});

const $$game = useGameStore();
const $router = useRouter();

// On mount, check if we have game data and redirect appropriately
onMounted(() => {
  // If we have a roomName, redirect to the room-based URL
  if ($$game.roomName) {
    console.log("[Multi] Redirecting to room:", $$game.roomName);
    $router.replace(`/game/exam/multi/${$$game.roomName}`);
  } else if ($$game.flags.ingame.isGameStarted && $$game.gameId) {
    // Game is started but no roomName - something is wrong, go to lobby
    console.warn("[Multi] Game started but no roomName, going to lobby");
    $$game["~resetEverything"]();
    $router.replace({ name: "game-lobby" });
  } else {
    // No game in progress, redirect to lobby
    console.log("[Multi] No game in progress, redirecting to lobby");
    $router.replace({ name: "game-lobby" });
  }
});
</script>

<template>
  <div class="w-full h-full flex items-center justify-center">
    <div class="text-center">
      <div
        class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
      ></div>
      <p class="text-lg font-semibold">Redirecting...</p>
    </div>
  </div>
</template>
