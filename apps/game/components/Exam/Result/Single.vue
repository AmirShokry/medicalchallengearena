<script setup lang="ts">
import {
  ChartNoAxesColumnIncreasingIcon,
  HomeIcon,
  RotateCwIcon,
} from "lucide-vue-next";
defineProps<{
  totalQuestionsNumber: number;
  user: ReturnType<typeof useGameStore>["players"]["user"];
}>();
const $$game = useGameStore();
onMounted(() => window.scrollTo(0, 0));

onBeforeUnmount(() => $$game["~resetEverything"]());
</script>
<template>
  <div
    class="absolute flex justify-center py-6 w-full items-center min-h-full left-:0 top-0 bg-background"
  >
    <div class="flex flex-col items-center w-1/2 gap-6">
      <div
        class="flex justify-center items-center gap-10 text-center w-full px-4"
      >
        <div>
          <img
            :src="user.info.avatarUrl!"
            width="100"
            class="aspect-square max-md:hidden rounded-full object-cover"
          />
          <span class="font-medium">{{ user.info.username }}</span>
        </div>
      </div>
      <ul class="w-full px-2 gap-4 flex flex-col font-mono">
        <li
          class="bg-foreground text-primary-foreground font-semibold px-4 text-center py-2 rounded-md flex flex-col"
        >
          <span>{{ user.records.stats.correctAnswersCount }}</span>
          <span>Correct Answers ({{ totalQuestionsNumber }})</span>
        </li>
        <li
          class="bg-foreground text-primary-foreground font-semibold px-4 text-center py-2 rounded-md flex flex-col"
        >
          <span>{{ user.records.stats.wrongAnswersCount }}</span>
          <span>Incorrect Answers</span>
        </li>
        <li
          class="bg-foreground text-primary-foreground font-semibold px-4 text-center py-2 rounded-md flex flex-col"
        >
          <span>{{ user.records.stats.correctEliminationsCount }}</span>
          <span>Correct Eliminations</span>
        </li>
        <li
          class="bg-foreground text-primary-foreground font-semibold px-4 text-center py-2 rounded-md flex flex-col"
        >
          <span>{{ user.records.stats.wrongEliminationsCount }}</span>
          <span>Incorrect Eliminations</span>
        </li>
        <li
          class="bg-foreground text-primary-foreground px-4 font-semibold text-center py-2 rounded-md flex flex-col"
        >
          <span>{{ user.records.stats.totalMedpoints }}</span>
          <span class="text-ring">Total Medpoints</span>
        </li>
      </ul>
      <div
        class="w-full px-2 flex justify-center gap-4 pb-4 h-full items-center"
      >
        <UiButton
          class="cursor-pointer"
          variant="secondary"
          @click="$router.push({ name: 'game-lobby' })"
          title="Back to lobby"
        >
          <HomeIcon />
        </UiButton>
        <UiButton
          disabled
          variant="secondary"
          class="cursor-pointer"
          title="Restart the game - coming soon"
        >
          <RotateCwIcon />
        </UiButton>
        <UiButton
          class="cursor-pointer"
          variant="secondary"
          @click="$router.push({ name: 'ranks' })"
          title="Go to leaderboard"
        >
          <ChartNoAxesColumnIncreasingIcon />
        </UiButton>
      </div>
    </div>
  </div>
</template>
