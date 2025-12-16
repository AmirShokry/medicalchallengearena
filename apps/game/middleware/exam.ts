import type { RouteLocationNormalized } from "vue-router";

export default defineNuxtRouteMiddleware((to, from) => {
  const gameStore = useGameStore();

  // If user info is not loaded yet, don't redirect - let the page handle reconnection
  // The page will emit requestGameReconnection to restore state
  if (!gameStore.players.user.info.username) {
    // For room-based multi routes, allow through - they handle their own reconnection
    if (to.path.startsWith("/game/exam/multi/")) {
      return; // Let the page handle it via requestGameReconnection
    }

    // For other exam routes (solo), redirect to setup
    const pathParts = to.path.split("/");
    const mode = pathParts[pathParts.length - 1];
    if (!mode || mode === "exam") return "/game/lobby";
    return `/game/setup/${mode}`;
  }
});
