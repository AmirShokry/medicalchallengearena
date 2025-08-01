import type { RouteLocationNormalized } from "vue-router";

export default defineNuxtRouteMiddleware((to, from) => {
  const gameStore = useGameStore();
  if (!gameStore.players.user.info.username) {
    const mode = from.fullPath.split("/").pop();
    if (!mode) return "/";
    return `/game/setup/${mode}`;
  }
});
