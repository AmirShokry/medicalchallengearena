<script setup lang="ts">
import { UsersIcon } from "lucide-vue-next";
import { msToMinutesAndSecondsPrecise } from "@/composables/timeFormatter";
//@ts-expect-error
import { RecycleScroller } from "vue-virtual-scroller";
import { useMediaQuery } from "@vueuse/core";
definePageMeta({
  layout: "lobby",
});
useSeoMeta({
  title: "MCA | Review",
  description: "Review your game performance and statistics.",
});

const { $trpc } = useNuxtApp();

const currentPageNo = ref(0);
const activeMode = ref<"unranked" | "single">("unranked");
const records = ref<any[]>([]);
const canClickLoadMore = ref(true);
const scrollerRef = useTemplateRef("scrollerRef");
const isMobile = useMediaQuery("(max-width: 640px)");
const userStore = useUserStore();
const router = useRouter();

const { data } = $trpc.reviews.meta.useQuery(() => ({
  mode: activeMode.value,
}));

watch(
  [data, activeMode],
  ([newData, newMode], [oldData, oldMode]) => {
    if (newMode !== oldMode) {
      currentPageNo.value = 0;
      records.value = newData && newData.length ? newData : [];
      canClickLoadMore.value = !!(newData && newData.length);
      nextTick(() => {
        if (scrollerRef.value) scrollerRef.value.scrollToItem(0);
      });
      return;
    }
    if (records.value.length === 0 && newData && newData.length) {
      records.value = newData;
      canClickLoadMore.value = true;
    } else if (!newData || !newData.length) {
      canClickLoadMore.value = false;
    }
  },
  { immediate: true }
);

async function handleLoadMore() {
  if (!canClickLoadMore.value) return;
  currentPageNo.value++;
  const moreData = await $trpc.reviews.meta.query({
    page: currentPageNo.value,
    mode: activeMode.value,
  });
  if (!moreData || !moreData.length) {
    canClickLoadMore.value = false;
    return;
  }
  records.value = [...records.value, ...moreData];
  nextTick(() => {
    scrollerRef.value.scrollToItem(records.value.length - 1);
  });
}
function toggleMode() {
  activeMode.value = activeMode.value === "unranked" ? "single" : "unranked";
}

function handleRecordClicked(gameId: number) {
  if (!userStore?.user?.id) return;
  router.push({
    name: "game-review-userId.gameId",
    params: { gameId, userId: userStore.user.id },
  });
  // const record = JSON.stringify(records.value.find((record) => record.gameId === gameId));
  // $router.push({ name: 'review', state: { record } });
}
</script>
<template>
  <header
    class="sticky top-0 flex h-10 shrink-0 items-center gap-2 bg-background"
  >
    <div class="flex flex-1 items-center gap-2 px-3">
      <UiSidebarTrigger side="left" class="cursor-pointer" />
      <UiSidebarTrigger side="right" class="cursor-pointer ml-auto max-lg:mr-1">
        <UsersIcon />
      </UiSidebarTrigger>
    </div>
  </header>
  <div class="flex flex-1 flex-col gap-4 pt-1 m-10 px-10">
    <!-- Tabs for mode switching -->
    <div class="flex gap-2 mb-4 mx-6">
      <button
        class="px-4 py-2 rounded-md border border-border focus:outline-none"
        :class="{
          'bg-muted font-bold': activeMode === 'unranked',
          'bg-background': activeMode === 'single',
        }"
        @click="toggleMode"
      >
        Multi
      </button>
      <button
        class="px-4 py-2 rounded-md border border-border focus:outline-none"
        :class="{
          'bg-muted font-bold': activeMode === 'single',
          'bg-background': activeMode === 'unranked',
        }"
        @click="toggleMode"
      >
        Solo
      </button>
    </div>
    <div ref="div" class="px-6 flex flex-col overflow-y-auto thin-scrollbar">
      <!-- Unranked Tab -->
      <div v-if="activeMode === 'unranked'">
        <RecycleScroller
          style="height: 50vh"
          :items="records"
          ref="scrollerRef"
          :item-size="isMobile ? 200 : 100"
          key-field="gameId"
          v-slot="{ item }"
        >
          <li
            @click="handleRecordClicked(item.gameId)"
            :key="item.gameId"
            class="max-sm:flex-row flex flex-col gap-1 border-2 p-5 justify-center border-border rounded-md shadow-lg cursor-pointer hover:scale-[0.99] hover:bg-accent"
          >
            <header class="max-sm:grid-cols-1 grid grid-cols-4 text-center">
              <p class="truncate">Opponent</p>
              <p class="truncate">Duration</p>
              <p class="truncate">Date</p>
              <p class="truncate">Result</p>
            </header>
            <div
              class="max-sm:grid-cols-1 grid grid-cols-4 text-sm text-center"
            >
              <div class="flex items-center justify-center gap-1 px-2">
                <img
                  :src="item.opponentAvatarUrl!"
                  class="max-md:hidden w-5 h-5 rounded-full object-cover"
                />
                <p class="truncate">{{ item.opoonentUsername }}</p>
              </div>
              <p class="truncate">
                {{ msToMinutesAndSecondsPrecise(item.durationMs || 0) }}
              </p>
              <p class="truncate">
                {{ item.date.toLocaleDateString("en-US") }}
              </p>
              <p
                :class="{
                  'text-success': item.hasWon === true,
                  'text-destructive': item.hasWon === false,
                  'text-ring': item.hasWon === null,
                }"
                class="truncate"
              >
                {{
                  item.hasWon === true
                    ? "Victory"
                    : item.hasWon === false
                      ? "Defeat"
                      : "Draw"
                }}
              </p>
            </div>
          </li>
        </RecycleScroller>
      </div>
      <!-- Single Tab -->
      <div v-else>
        <RecycleScroller
          style="height: 50vh"
          :items="records"
          ref="scrollerRef"
          :item-size="isMobile ? 200 : 100"
          key-field="gameId"
          v-slot="{ item }"
        >
          <li
            @click="handleRecordClicked(item.gameId)"
            :key="item.gameId"
            class="max-sm:flex-row flex flex-col gap-1 border-2 p-5 justify-center border-border rounded-md shadow-lg cursor-pointer hover:scale-[0.99] hover:bg-accent"
          >
            <header class="max-sm:grid-cols-1 grid grid-cols-2 text-center">
              <p class="truncate">Duration</p>
              <p class="truncate">Date</p>
            </header>
            <div
              class="max-sm:grid-cols-1 grid grid-cols-2 text-sm text-center"
            >
              <p class="truncate">
                {{ msToMinutesAndSecondsPrecise(item.durationMs || 0) }}
              </p>
              <p class="truncate">
                {{ item.date.toLocaleDateString("en-US") }}
              </p>
            </div>
          </li>
        </RecycleScroller>
      </div>
      <div
        v-if="canClickLoadMore"
        class="bg-muted p-4 my-10 rounded-md text-center cursor-pointer hover:scale-[0.98]"
        @click="handleLoadMore"
      >
        Load More
      </div>
      <div
        v-if="!records.length"
        class="light-border-0.3 p-4 rounded-md text-center mt-4"
      >
        No records found
      </div>
    </div>
  </div>
</template>
