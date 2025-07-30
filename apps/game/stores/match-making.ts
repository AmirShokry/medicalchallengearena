import { defineStore } from "pinia";

export const useMatchMakingStore = defineStore("match-making-store", () => {
  const state = ref<
    | "idle"
    | "finding-match"
    | "waiting-approval"
    | "reviewing-invitation"
    | "selecting-block"
    | "in-game"
    | "finished"
  >("idle");

  return {
    state,
  };
});
