<script setup lang="ts">
import MatchFoundSplash from "@/components/splash/MatchFoundSplash.vue";
import { UsersIcon, SearchIcon } from "lucide-vue-next";
import { gameSocket } from "@/components/socket";
import type { MatchingSystemCategories } from "@/shared/types/common";
import type { ToClientIO } from "@/shared/types/socket";
import Fuse from "fuse.js";
import useSocial from "@/composables/useSocial";

const { $trpc } = useNuxtApp();
const audio = useAudioStore();
definePageMeta({
  layout: "multi",
});
const $$game = useGameStore();
const { user } = storeToRefs(useUserStore());
const user1Id = computed(() => $$game.players.user.info.id);
const user2Id = computed(() => $$game.players.opponent.info.id);
const searchQuery = ref("");

const matchmaking = useMatchMakingStore();
matchmaking.state = "idle";

// Set user status to matchmaking
const social = useSocial();
nextTick(() => social.setStatus("matchmaking"));

const data = ref([] as MatchingSystemCategories);
const counters = ref(
  [] as {
    allCount: number;
    unusedCount1: number;
    unusedCount2: number;
    matchingCount: number;
  }[]
);

watch(user2Id, async () => {
  if (user2Id.value <= 0) return;
  data.value = await $trpc.systems.matchingSystemCategories.query({
    user1Id: user1Id.value,
    user2Id: user2Id.value,
  });

  counters.value = await $trpc.cases.mactchingCount.query({
    user1Id: user1Id.value,
    user2Id: user2Id.value,
  });
});

const systemsCategoriesRaw = computed(() => {
  return data.value.map((system) => ({
    ...system,
    isChecked: false,
    categories: system.categories.map((category) => ({
      ...category,
      isChecked: false,
    })),
  }));
});

const systemsCategories = computed(() => {
  if (!searchQuery.value.trim()) return systemsCategoriesRaw.value;
  if (!fuse.value) return systemsCategoriesRaw.value;
  return fuse.value.search(searchQuery.value).map((result) => result.item);
});
const fuse = computed(() => {
  if (!systemsCategoriesRaw.value.length) return null;
  return new Fuse(systemsCategoriesRaw.value, {
    keys: ["name", "categories.name"],
    threshold: 0.3,
  });
});

const isRoomMaster = computed(() => $$game.players.user.flags.isMaster);
const unusedCount = computed(() =>
  isRoomMaster
    ? counters.value?.[0]?.unusedCount2 || 0
    : counters.value?.[0]?.unusedCount1 || 0
);
const selectedPool = ref<"all" | "unused">(
  unusedCount.value > 0 ? "unused" : "all"
);
const selectedCasesCount = ref(0);
const possibleCasesCount = ref([] as number[]);

const allCount = computed(() => counters.value?.[0]?.allCount);

function getCategoryCounter(
  category: (typeof systemsCategoriesRaw.value)[0]["categories"][0]
) {
  return isRoomMaster.value ? category.unusedCount2 : category.unusedCount1;
}

const matchingCount = computed(() => counters.value?.[0]?.matchingCount || 0);

watch(
  user,
  () =>
    user.value ? $$game.players.user.info["~set"](user.value!) : undefined,
  { immediate: true }
);

function handlePoolSelected(value: "all" | "unused", isRemote?: boolean) {
  if (!isRemote)
    gameSocket
      .timeout(10000)
      .emit("userSelected", { target: "pool", pool: value });
  selectedPool.value = value;
  resetCasesCounters();
  systemsCategories.value.forEach((system) => {
    system.categories.forEach((category) => (category.isChecked = false));
    system.isChecked = false;
  });
}
function handleToggleEntireSystemCategories(
  sysIndex: number,
  isRemote?: boolean
) {
  if (!isRemote)
    gameSocket.emit("userSelected", { target: "allSystems", sysIndex });
  const system = systemsCategories.value[sysIndex];
  if (!system) return;
  system.isChecked = !system.isChecked;
  system.categories.forEach((category, catIndex) => {
    if (canSelectCategory(sysIndex, catIndex)) toggleCategories(catIndex);
    if (isRemote) {
      if (
        selectedPool.value === "all" ||
        (selectedPool.value === "unused" && getCategoryCounter(category) > 0)
      )
        toggleCategories(catIndex);
    }
  });

  function toggleCategories(catIndex: number) {
    if (!system) return;
    const category = system.categories[catIndex];
    if (!category) return;

    category.isChecked = system.isChecked;

    if (category.isChecked)
      updateCasesCounters(
        selectedPool.value === "all"
          ? category.allCount
          : getCategoryCounter(category)
      );
    else
      updateCasesCounters(
        selectedPool.value === "all"
          ? -category.allCount
          : -getCategoryCounter(category)
      );
  }
}

function handleToggleCategory(
  sysIndex: number,
  catIndex: number,
  isRemote?: boolean
) {
  if (!isRemote)
    gameSocket.emit("userSelected", { target: "category", sysIndex, catIndex });

  const system = systemsCategories.value[sysIndex];
  if (!system) return;
  const category = system.categories[catIndex];
  if (!category) return;
  category.isChecked = !category.isChecked;
  if (category.isChecked)
    updateCasesCounters(
      selectedPool.value === "all"
        ? category.allCount
        : getCategoryCounter(category)
    );
  else
    updateCasesCounters(
      selectedPool.value === "all"
        ? -category.allCount
        : -getCategoryCounter(category)
    );
  const areAllCategoriesInSystemSelected = () =>
    system.categories.every((category) => category.isChecked);
  system.isChecked = areAllCategoriesInSystemSelected(); //Also updates the system checkbox if one category is off, then it should be off as well
}

function handleContinueToGame() {
  const selections = {
    pool: selectedPool.value,
    casesCount: selectedCasesCount.value,
    selectedCatIds: systemsCategories.value.flatMap((system) => {
      return system.categories
        .filter((category) => category.isChecked)
        .map((category) => category.id);
    }),
  };

  $$game.flags.ingame.isGameStarted = true;
  gameSocket.emit("userStartedGame", selections);
  audio.user_vs_opponent.play();
}

function updateCasesCounters(amount: number) {
  selectedCasesCount.value += amount;
  possibleCasesCount.value = [];
  for (let i = selectedCasesCount.value; i > 0; i = Math.floor(i / 2))
    possibleCasesCount.value.push(i);
}
function resetCasesCounters() {
  selectedCasesCount.value = 0;
  possibleCasesCount.value = [];
}

function canSelectAddEntireSystem(sysIndex: number) {
  if (!isRoomMaster.value) return false;
  const system = systemsCategories.value[sysIndex];
  if (!system) return false;
  return system.categories.some((_, catIndex) =>
    canSelectCategory(sysIndex, catIndex)
  );
}
const canSelectQuestionPool = () => isRoomMaster.value;
function canSelectCategory(sysIndex: number, catIndex: number) {
  if (!isRoomMaster.value) return false;
  const system = systemsCategories.value[sysIndex];
  if (!system) return false;
  const category = system.categories[catIndex];
  if (!category) return false;
  if (selectedPool.value === "all" && category.allCount > 0) return true;
  if (selectedPool.value === "unused" && getCategoryCounter(category) > 0)
    return true;
  return false;
}
function isAnyCategorySelected() {
  return systemsCategories.value.some((system) =>
    system.categories.some((category) => category.isChecked)
  );
}

const canSelectCasesCount = () => isRoomMaster.value && isAnyCategorySelected();
const canSelectContinueToGame = () =>
  isRoomMaster.value && isAnyCategorySelected();

gameSocket.onAny((event, ...args) => {
  if (event === "opponentSelected") {
    const data = args[0] as Parameters<
      ToClientIO.Game.Events["opponentSelected"]
    >[0];
    switch (data.target) {
      case "pool":
        if (!data.pool) return;
        handlePoolSelected(data.pool, true);
        break;
      case "questionsCount":
        if (!Number.isInteger(data.questionsCount)) return;
        handleCasesCountUpdated(data.questionsCount!, true);
        break;
      case "category":
        if (
          !(Number.isInteger(data.sysIndex) && Number.isInteger(data.catIndex))
        )
          return;
        handleToggleCategory(data.sysIndex!, data.catIndex!, true);
        break;
      case "allSystems":
        if (!Number.isInteger(data.sysIndex)) return;
        handleToggleEntireSystemCategories(data.sysIndex!, true);
        break;
    }
  }
});

const canShowSplash = computed(
  () =>
    (matchmaking.state === "reviewing-invitation" ||
      matchmaking.state === "waiting-approval") &&
    !$$game.players.opponent.flags.hasDeclined &&
    !$$game.players.opponent.flags.hasLeft
);
function handleCasesCountUpdated(questionsCount: number, isRemote?: boolean) {
  if (!isRemote)
    gameSocket.emit("userSelected", {
      target: "questionsCount",
      questionsCount,
    });

  selectedCasesCount.value = questionsCount;
}

function handleAccept() {
  audio.navigation.play();
  $$game.players.user.flags.hasAccepted = true;
  gameSocket.emit("userAccepted");
  matchmaking.state = "waiting-approval";
}

function handleLeaveOrDecline(fromAction?: boolean) {
  if (fromAction) audio.navigation.play();

  matchmaking.state = "idle";
  $$game["~resetEverything"]();
  gameSocket.emit("userDeclined");
  gameSocket.emit("userLeft");
  // Reset status to matchmaking when declining (still on multi page)
  social.setStatus("matchmaking");
  console.log("Leaving or declining game");
}

watchEffect(() => {
  if (counters.value.length && user2Id.value > 0) {
    selectedPool.value = unusedCount.value > 0 ? "unused" : "all";
  }
});
onUnmounted(() => {
  if (!$$game.flags.ingame.isGameStarted) {
    handleLeaveOrDecline(true);
    // Reset status to online when leaving multi setup page
    social.setStatus("online");
  }
});
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
  <div class="flex h-full items-center" v-if="matchmaking.state === 'idle'">
    <OpponentSelect />
  </div>
  <MatchFoundSplash
    v-if="canShowSplash"
    @accept="handleAccept"
    @decline="handleLeaveOrDecline(true)"
  />

  <div
    v-if="matchmaking.state === 'selecting-block'"
    class="flex flex-col justify-center items-center w-full py-30"
  >
    <div class="w-8/10 flex flex-col h-full">
      <section class="player-vs-opponent-wrapper flex flex-col items-center">
        <p v-if="!isRoomMaster" class="animate-pulse text-xs py-4">
          Opponent is selecting..
        </p>
        <div class="user-vs-opponent-wrapper flex items-center gap-4">
          <div class="flex flex-col gap-2 items-center justify-center">
            <img
              alt="user-logo"
              :src="$$game.players.user.info.avatarUrl!"
              width="80px"
              class="aspect-square object-cover rounded-full"
            />
            <p class="text-[1rem] font-medium capitalize">
              {{ $$game.players.user.info.username }}
            </p>
          </div>
          <SvgoVersus />
          <div class="flex flex-col gap-2 items-center justify-center">
            <img
              alt="opponent-logo"
              :src="$$game.players.opponent.info.avatarUrl!"
              width="80px"
              class="aspect-square rounded-full object-cover"
            />
            <p class="text-[1rem] font-medium capitalize">
              {{ $$game.players.opponent.info.username }}
            </p>
          </div>
        </div>
      </section>
      <UiSeparator orientation="horizontal" class="my-7" />

      <div class="grid gap-6 h-[50vh] min-h-0">
        <div class="flex flex-col min-h-0 mb-10">
          <section class="categories flex flex-col flex-1 min-h-0">
            <div class="my-4 flex items-center gap-4 flex-wrap">
              <strong>Categories</strong>
              <div class="relative w-1/3 max-md:flex-1">
                <UiInput
                  id="search"
                  type="text"
                  class="pr-10 h-8 !text-xs"
                  v-model="searchQuery"
                  placeholder="Search for systems or categories..."
                />
                <span
                  class="absolute end-0 inset-y-0 flex items-center justify-center px-2"
                >
                  <SearchIcon class="size-4 text-muted-foreground" />
                </span>
              </div>
              <div class="max-md:ml-0 ml-auto">
                <UiRadioGroup
                  aria-role="select-question-pool"
                  v-disabled-click="!canSelectQuestionPool()"
                  default-value="all"
                  v-model="selectedPool"
                  @update:model-value="
                    (value: string) =>
                      handlePoolSelected(value as 'all' | 'unused')
                  "
                >
                  <div class="flex gap-2">
                    <span class="text-sm truncate">Pool</span>
                    <div class="flex items-center space-x-2">
                      <UiRadioGroupItem
                        class="cursor-pointer"
                        id="all"
                        value="all"
                      />
                      <UiLabel for="all">All ({{ allCount }})</UiLabel>
                    </div>
                    <div class="flex items-center space-x-2">
                      <UiRadioGroupItem
                        class="cursor-pointer"
                        id="unused"
                        value="unused"
                      />
                      <UiLabel for="unused">Unused ({{ unusedCount }})</UiLabel>
                    </div>
                  </div>
                </UiRadioGroup>
              </div>
            </div>
            <div
              class="categories-wrapper flex-1 overflow-y-auto thin-scrollbar snap-y snap-mandatory"
            >
              <div
                v-for="(system, sysIndex) in systemsCategories"
                class="snap-end mb-4"
              >
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-sm" :for="system.name">
                    {{ system.name }}
                  </span>

                  <UiCheckbox
                    aria-role="select-entire-system"
                    :key="system.name"
                    :id="system.name"
                    class="cursor-pointer"
                    :disabled="!canSelectAddEntireSystem(sysIndex)"
                    @update:modelValue="
                      handleToggleEntireSystemCategories(sysIndex)
                    "
                    v-model="system.isChecked"
                  />
                </div>
                <div class="flex flex-wrap gap-1 overflow-auto">
                  <div
                    class="flex items-center gap-2"
                    v-for="(category, catIndex) in system.categories"
                  >
                    <UiToggle
                      aria-role="select-category"
                      variant="outline"
                      :id="system.name"
                      class="cursor-pointer text-xs dark:data-[state=on]:bg-teal-700 data-[state=on]:bg-teal-400"
                      :disabled="!canSelectCategory(sysIndex, catIndex)"
                      @update:modelValue="
                        handleToggleCategory(sysIndex, catIndex)
                      "
                      :key="category.id"
                      v-model="category.isChecked"
                    >
                      {{ category.name }} ({{
                        selectedPool === "all"
                          ? category.allCount
                          : getCategoryCounter(category)
                      }})
                    </UiToggle>
                  </div>
                </div>
                <UiSeparator orientation="horizontal" class="my-3" />
              </div>
            </div>
          </section>
        </div>
      </div>
      <div class="flex items-center px-4 justify-end gap-4">
        <div
          v-disabled-click="!canSelectCasesCount()"
          class="flex items-center gap-2"
        >
          <UiSelect v-model="selectedCasesCount">
            <UiSelectTrigger>
              <UiSelectValue placeholder="Cases #" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectGroup>
                <UiSelectItem
                  v-for="count in possibleCasesCount"
                  :key="count"
                  :value="count"
                >
                  {{ count }}
                </UiSelectItem>
              </UiSelectGroup>
            </UiSelectContent>
          </UiSelect>
        </div>

        <UiButton
          :disabled="!canSelectContinueToGame()"
          @click="handleContinueToGame"
          class="text-sm"
        >
          Start
        </UiButton>
      </div>
    </div>
  </div>
</template>
<style scoped>
:deep(.v-input.custom-v-select .v-field) {
  font-size: 0.8rem !important;
}
</style>
