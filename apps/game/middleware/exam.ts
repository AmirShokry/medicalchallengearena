import type { RouteLocationNormalized } from "vue-router";

export default defineNuxtRouteMiddleware((to, from) => {
  const gameStore = useGameStore();
  
  // Debug logging
  if (to.path.includes('/exam/multi')) {
    console.log("[Exam Middleware] Route:", to.path);
    console.log("[Exam Middleware] User info loaded:", !!gameStore.players.user.info.username);
    console.log("[Exam Middleware] Username:", gameStore.players.user.info.username);
  }

  // If user info is not loaded yet, don't redirect - let the page handle reconnection
  // The page will emit requestGameReconnection to restore state
  if (!gameStore.players.user.info.username) {
    // For room-based multi routes, allow through - they handle their own reconnection
    if (to.path.startsWith("/game/exam/multi/")) {
      console.log("[Exam Middleware] Allowing room-based multi route through");
      return; // Let the page handle it via requestGameReconnection
    }

    // For other exam routes (solo), redirect to setup
    const pathParts = to.path.split("/");
    const mode = pathParts[pathParts.length - 1];
    if (!mode || mode === "exam") return "/game/lobby";
    return `/game/setup/${mode}`;
  }
});
