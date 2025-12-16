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

console.log("[Multi Redirect Page] Script setup executing");
console.log("[Multi Redirect Page] roomName:", $$game.roomName);
console.log("[Multi Redirect Page] isGameStarted:", $$game.flags.ingame.isGameStarted);
console.log("[Multi Redirect Page] gameId:", $$game.gameId);

// On mount, check if we have game data and redirect appropriately
onMounted(async () => {
  console.log("[Multi Redirect Page] onMounted triggered");
  
  // If we have a roomName, redirect to the room-based URL
  if ($$game.roomName) {
    const targetPath = `/game/exam/multi/${$$game.roomName}`;
    console.log("[Multi Redirect Page] Attempting navigation to:", targetPath);
    try {
      await $router.replace(targetPath);
      console.log("[Multi Redirect Page] Navigation completed successfully");
    } catch (err) {
      console.error("[Multi Redirect Page] Navigation failed:", err);
    }
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
