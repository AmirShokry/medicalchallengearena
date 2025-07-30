<script setup lang="ts">
import MatchFoundSplash from "~/components/splash/MatchFoundSplash.vue";
import { UsersIcon } from "lucide-vue-next";
import { sounds } from "@/composables/audio.client";
import { gameSocket } from "@/components/socket";
definePageMeta({
  layout: "game",
});
const $$game = useGameStore();
const { selectableData } = storeToRefs($$game);

// Use computed to maintain reactivity
const systemsCategories = computed(
  () => selectableData.value.systemsCategories
);
const allCount = computed(() => selectableData.value.allCount);
const unusedCount = computed(() => selectableData.value.unusedCount);
const matchingCount = computed(() => selectableData.value.matchingCount);

const { user } = storeToRefs(useUserStore());

// Watch for user changes and set it in game store when available
watch(
  user,
  () =>
    user.value ? $$game.players.user.info["~set"](user.value!) : undefined,
  { immediate: true }
);

const matchmaking = useMatchMakingStore();

matchmaking.state = "idle";

const selectedPool = ref<"all" | "unused">("all");
const selectedUnit = reactive(new Map([]) as Map<number, Set<number>>);
const selectedCasesCount = ref(0);
const possibleCasesCount = ref([] as number[]);

const isRoomMaster = computed(() => $$game.players.user.flags.isMaster);

const isSystemSelected = (sysId: number) => selectedUnit.has(sysId);
const isCategoryChecked = (sysId: number, catId: number) =>
  !!selectedUnit.get(sysId)?.has(catId);
const isEverySystemCategorySelected = (sysId: number) =>
  selectedUnit.get(sysId)?.size ===
  systemsCategories.value.find((sys) => sys.id === sysId)?.categories.length;

const isAnyCategorySelected = computed(() =>
  [...selectedUnit.values()].some((v) => v.size)
);
const isSelectionMade = computed(
  () => selectedUnit.size && isAnyCategorySelected.value
);

const canSelectQuestionPool = () => isRoomMaster.value;
const canSelectSystems = (sysMatchCount: number) =>
  isRoomMaster.value &&
  (selectedPool.value === "unused" ? sysMatchCount > 0 : true);
const canSelectAddEntireSystem = (sysId: number) =>
  selectedUnit.has(sysId) && $$game.players.user.flags.isMaster;

const canSelectCategory = (sysId: number, catMatchCount: number) =>
  isRoomMaster.value &&
  selectedUnit.has(sysId) &&
  (selectedPool.value === "unused" ? catMatchCount > 0 : true);

const canSelectCasesCount = () => isRoomMaster.value && isSelectionMade.value;
const canSelectContinueToGame = () =>
  isRoomMaster.value && isSelectionMade.value;

function handleSystemSelected(sysId: number, isRemote?: boolean) {
  if (!isRemote) gameSocket.emit("userSelected", { target: "system", sysId });
  if (selectedUnit.has(sysId)) selectedUnit.delete(sysId);
  else selectedUnit.set(sysId, new Set());
}
function handleCategorySelected(
  sysId: number,
  catId: number,
  isRemote?: boolean
) {
  if (!isRemote)
    gameSocket.emit("userSelected", { target: "category", sysId, catId });

  const selectedSystem = selectedUnit.get(sysId);
  if (!selectedSystem) return selectedUnit.set(sysId, new Set([catId]));

  if (selectedSystem.has(catId)) selectedSystem.delete(catId);
  else selectedSystem.add(catId);
}

function handlePoolSelected(pool: "all" | "unused", isRemote?: boolean) {
  if (!isRemote)
    gameSocket.timeout(10000).emit("userSelected", { target: "pool", pool });
  selectedPool.value = pool;
  resetCasesCounters();
  for (let key of selectedUnit.keys()) selectedUnit.delete(key);
}
function handleSystemGroupSelected(sysId: number, isRemote?: boolean) {
  if (!isRemote)
    gameSocket.emit("userSelected", { target: "allSystems", sysId });
  if (isEverySystemCategorySelected(sysId))
    return selectedUnit.get(sysId)?.clear();

  selectedUnit.set(
    sysId,
    new Set(
      systemsCategories.value
        .find((sys) => sys.id === sysId)
        ?.categories.map((cat) => cat.id)
    )
  );
}

function handleCasesCountUpdated(questionsCount: number, isRemote?: boolean) {
  if (!isRemote)
    gameSocket.emit("userSelected", {
      target: "questionsCount",
      questionsCount,
    });

  selectedCasesCount.value = questionsCount;
}

function handleContinueToGame() {
  const selections = {
    pool: selectedPool.value,
    casesCount: selectedCasesCount.value,
    selectedCatIds: [...selectedUnit.values()].flatMap((catIds) => [...catIds]),
  };

  $$game.flags.ingame.isGameStarted = true;
  gameSocket.emit("userStartedGame", selections);
  sounds.user_vs_opponent.play();
}

// Defining event listners in here causes the event to be missed if the user clicked too fast before the other user is present.
gameSocket.on("opponentSelected", (data) => {
  switch (data.target) {
    case "pool":
      if (!data.pool) return;
      handlePoolSelected(data.pool, true);
      break;
    case "questionsCount":
      if (!Number.isInteger(data.questionsCount)) return;
      handleCasesCountUpdated(data.questionsCount!, true);
      break;
    case "system":
      if (!Number.isInteger(data.sysId)) return;
      handleSystemSelected(data.sysId!, true);
      break;
    case "category":
      if (!(Number.isInteger(data.sysId) && Number.isInteger(data.catId)))
        return;
      handleCategorySelected(data.sysId!, data.catId!, true);
      break;
    case "allSystems":
      if (!(Number.isInteger(data.sysId) && data.sysId)) return;
      handleSystemGroupSelected(data.sysId, true);
      break;
  }
});

watch(selectedUnit, function updateCasesCounters() {
  resetCasesCounters();

  for (const selectedCatIds of selectedUnit.values()) {
    systemsCategories.value.forEach((system) => {
      system.categories.forEach((cat) => {
        if (selectedCatIds.has(cat.id))
          selectedCasesCount.value +=
            selectedPool.value === "all" ? cat.allCount : cat.matchCount;
      });
    });
  }

  for (let i = selectedCasesCount.value; i > 0; i = Math.floor(i / 2))
    possibleCasesCount.value.push(i);
});

function resetCasesCounters() {
  selectedCasesCount.value = 0;
  possibleCasesCount.value = [];
}

const canShowSplash = computed(
  () =>
    (matchmaking.state === "reviewing-invitation" ||
      matchmaking.state === "waiting-approval") &&
    !$$game.players.opponent.flags.hasDeclined &&
    !$$game.players.opponent.flags.hasLeft
);

function handleAccept() {
  // sounds.navigation.play();
  // sounds.match_found.pause();
  // sounds.match_found.currentTime = 0;
  $$game.players.user.flags.hasAccepted = true;
  gameSocket.emit("userAccepted");
  matchmaking.state = "waiting-approval";
}

function handleLeaveOrDecline(fromAction?: boolean) {
  // if (fromAction) sounds.navigation.play();
  // sounds.match_found.pause();
  // sounds.match_found.currentTime = 0;
  matchmaking.state = "idle";
  $$game["~resetEverything"]();
  gameSocket.emit("userDeclined");
  console.log("Leaving or declining game");
}
matchmaking.state = "idle";

// Handle component unmounting
onUnmounted(() => {
  handleLeaveOrDecline();
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
    <div class="wrapper w-3/4 flex flex-col h-full">
      <header class="flex flex-col items-center">
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
          <SvgoVersus></SvgoVersus>
          <!-- <i-svg
						v-if="$$game.mode !== 'single'"
						src="./versus.svg"
						width="56"
						height="62"
						class="flex-shrink ml-1" /> -->

          <div
            v-if="$$game.mode !== 'single'"
            class="flex flex-col gap-2 items-center justify-center"
          >
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
      </header>

      <main class="settings flex flex-col py-4 h-full">
        <section class="pool flex gap-4 items-center justify-center py-6">
          <span class="text-xs truncate">Cases Pool</span>
          <div class="flex gap-4" v-disabled-click="!canSelectQuestionPool()">
            <UiRadioGroup
              default-value="all"
              v-model="selectedPool"
              @update:model-value="
                (value: string) => handlePoolSelected(value as 'all' | 'unused')
              "
            >
              <div class="flex items-center space-x-2">
                <UiRadioGroupItem id="all" value="all" />
                <UiLabel for="all">All ({{ allCount }})</UiLabel>
              </div>
              <div class="flex items-center space-x-2">
                <UiRadioGroupItem id="unused" value="unused" />
                <UiLabel for="unused">Unused ({{ unusedCount }})</UiLabel>
              </div>
            </UiRadioGroup>
          </div>

          <div
            v-if="selectedPool === 'unused'"
            class="flex items-center gap-2 justify-center text-sm"
          >
            <span>Matching Cases: </span>
            <span class="bg-neutral-400 text-black rounded-md px-2 truncate">
              {{ matchingCount }}
            </span>
          </div>
        </section>
        <section
          class="flex gap-4 overflow-x-auto overflow-y-hidden thin-scrollbar"
        >
          <UiToggle
            class="flex-shrink-0 not-checked:bg-muted/50 not-checked:text-ring"
            v-for="system in systemsCategories"
            :title="system.name"
            @click="handleSystemSelected(system.id)"
            :pressed="isSystemSelected(system.id)"
            v-disabled-click="!canSelectSystems(system.matchCount)"
            :key="`${system.id}-${selectedPool}`"
          >
            {{ system.name }}
          </UiToggle>
        </section>
        <section class="categories">
          <header class="text-base font-semibold pt-4 pb-4">
            Categories Selected
          </header>
          <div
            class="categories-wrapper h-[30dvh] overflow-y-auto thin-scrollbar snap-y snap-mandatory"
          >
            <div
              v-for="system in systemsCategories"
              class="border-b border-b-[rgba(255,255,255,0.1)] snap-end"
            >
              <div class="flex items-center gap-2 mb-2">
                <UiLabel :for="system.name">
                  {{ system.name }}
                </UiLabel>

                <UiCheckbox
                  :id="system.name"
                  v-disabled-click="!canSelectAddEntireSystem(system.id)"
                  @update:modelValue="handleSystemGroupSelected(system.id)"
                  :modelValue="isEverySystemCategorySelected(system.id)"
                />
              </div>
              <div class="flex flex-wrap gap-1 overflow-auto">
                <div
                  class="flex items-center gap-2"
                  v-disabled-click="
                    !canSelectCategory(system.id, category.matchCount)
                  "
                  v-for="category in system.categories"
                >
                  <UiCheckbox
                    :id="system.name"
                    v-disabled-click="!canSelectAddEntireSystem(system.id)"
                    @update:modelValue="
                      handleCategorySelected(system.id, category.id)
                    "
                    :key="category.id"
                    :modelValue="isCategoryChecked(system.id, category.id)"
                  />
                  <span class="text-xs"
                    >{{ category.name }} ({{
                      selectedPool === "all"
                        ? category.allCount
                        : category.matchCount
                    }})</span
                  >
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer class="flex justify-between items-center gap-5">
        <div
          v-disabled-click="!canSelectCasesCount()"
          class="flex items-center gap-2"
        >
          <span class="text-sm">Cases</span>
          <UiSelect
            v-model="selectedCasesCount"
            @update:model-value="
              (value: any) => {
                if (typeof value === 'number') {
                  handleCasesCountUpdated(value);
                }
              }
            "
          >
            <UiSelectTrigger class="w-[180px]">
              <UiSelectValue placeholder="Select Cases Count" />
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
          class="w-44 text-sm min-w-20"
        >
          Start
        </UiButton>
      </footer>
    </div>
  </div>
</template>
<style scoped>
:deep(.v-input.custom-v-select .v-field) {
  font-size: 0.8rem !important;
}
</style>
