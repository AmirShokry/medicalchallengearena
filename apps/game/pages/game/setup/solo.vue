<script setup lang="ts">
import { SearchIcon } from "lucide-vue-next";
import { UsersIcon } from "lucide-vue-next";
import Fuse from "fuse.js";
import useSocial from "@/composables/useSocial";

definePageMeta({
  layout: "lobby",
});
const audio = useAudioStore();
const { user } = storeToRefs(useUserStore());
const { $trpc } = useNuxtApp();
const $$game = useGameStore();
const $router = useRouter();

const selectedCasesCount = ref(0);
const possibleCasesCount = ref([] as number[]);
const systemsCategoriesRaw = ref(
  [] as NonNullable<typeof data.value>["systemsCategories"]
);

// Set user status to busy when in solo setup
const social = useSocial();
social.setStatus("busy");

// Reset status to online when leaving solo setup (if game didn't start)
onUnmounted(() => {
  if (!$$game.flags.ingame.isGameStarted) {
    social.setStatus("online");
  }
});

const searchQuery = ref("");

const { data, pending, error } = $trpc.systems.categories.useQuery(undefined, {
  transform: (data) => {
    return {
      ...data,
      systemsCategories: data.systemsCategories.map((system) => {
        return {
          ...system,
          isChecked: false,
          categories: system.categories.map((category) => {
            return {
              ...category,
              isChecked: false,
            };
          }),
        };
      }),
    };
  },
});

watchEffect(() => {
  if (data.value) {
    systemsCategoriesRaw.value = data.value.systemsCategories;

    selectedPool.value = data.value.unusedCount > 0 ? "unused" : "all";
  }
});

const systemsCategories = computed(() => {
  if (!searchQuery.value.trim()) return systemsCategoriesRaw.value;
  if (!fuse.value) return systemsCategoriesRaw.value;
  return fuse.value.search(searchQuery.value).map((result) => result.item);
});

const fuse = computed(() => {
  if (!data.value) return null;
  return new Fuse(data.value.systemsCategories, {
    keys: ["name", "categories.name"],
    threshold: 0.3,
  });
});
const unusedCount = computed(() => data.value?.unusedCount || 0);

const selectedPool = ref<"all" | "unused">(
  unusedCount.value > 0 ? "unused" : "all"
);
const allCount = computed(() => data.value?.allCount || 0);

watchEffect(() => {
  user.value ? $$game.players.user.info["~set"](user.value!) : undefined;
});

function handlePoolSelected(value: "all" | "unused") {
  selectedPool.value = value;
  resetCasesCounters();
  systemsCategories.value.forEach((system) =>
    system.categories.forEach((category) => (category.isChecked = false))
  );
}

function handleToggleEntireSystemCategories(sysIndex: number) {
  const system = systemsCategories.value[sysIndex];
  if (!system) return;
  system.isChecked = !system.isChecked;
  system.categories.forEach((_, catIndex) => {
    if (canSelectCategory(sysIndex, catIndex)) {
      const category = system.categories[catIndex];
      if (!category) return;
      category.isChecked = system.isChecked;
      if (category.isChecked)
        updateCasesCounters(
          selectedPool.value === "all"
            ? category.allCount
            : category.unusedCount
        );
      else
        updateCasesCounters(
          selectedPool.value === "all"
            ? -category.allCount
            : -category.unusedCount
        );
    }
  });
}
function handleToggleCategory(sysIndex: number, catIndex: number) {
  const system = systemsCategories.value[sysIndex];
  if (!system) return;
  const category = system.categories[catIndex];
  if (!category) return;
  category.isChecked = !category.isChecked;
  if (category.isChecked)
    updateCasesCounters(
      selectedPool.value === "all" ? category.allCount : category.unusedCount
    );
  else
    updateCasesCounters(
      selectedPool.value === "all" ? -category.allCount : -category.unusedCount
    );
}

async function handleContinueToGame() {
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

  // Set status to ingame when game actually starts
  social.setStatus("ingame");

  const { cases, gameId } = await $trpc.exam.startGame.mutate(selections);
  $$game.gameId = gameId;
  $$game.data.cases = cases;
  audio.user_vs_opponent.play();
  $router.push({ name: "game-exam-solo" });
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
  const system = systemsCategories.value[sysIndex];
  if (!system) return false;
  //Check if there is at least one category that can be selected
  return system.categories.some((_, catIndex) =>
    canSelectCategory(sysIndex, catIndex)
  );
}

function canSelectQuestionPool() {
  return true;
}

function canSelectCategory(sysIndex: number, catIndex: number) {
  const system = systemsCategories.value[sysIndex];
  if (!system) return false;
  const category = system.categories[catIndex];
  if (!category) return false;
  if (selectedPool.value === "all" && category.allCount > 0) return true;
  if (selectedPool.value === "unused" && category.unusedCount > 0) return true;
  return false;
}
function isAnyCategorySelected() {
  return systemsCategories.value.some((system) =>
    system.categories.some((category) => category.isChecked)
  );
}
function isEverySystemCategorySelected(sysIndex: number) {
  const system = systemsCategories.value[sysIndex];
  if (!system) return false;
  const areAllChecked = system.categories.every(
    (category) => category.isChecked
  );
  system.isChecked = areAllChecked;
  return areAllChecked;
}
function canSelectCasesCount() {
  return isAnyCategorySelected();
}
function canSelectContinueToGame() {
  return canSelectCasesCount();
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

  <div class="flex items-center justify-center h-full">
    <div class="flex flex-col w-8/10 pb-10">
      <div
        class="user-vs-opponent-wrapper flex items-center justify-center gap-4"
      >
        <div
          v-if="user"
          class="flex flex-col gap-2 items-center justify-center"
        >
          <img
            alt="user-logo"
            :src="user?.avatarUrl!"
            width="80px"
            class="aspect-square object-cover rounded-full"
          />
          <p class="text-[1rem] font-medium capitalize">
            {{ user.username }}
          </p>
        </div>
      </div>
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
                    :checked="isEverySystemCategorySelected(sysIndex)"
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
                          : category.unusedCount
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
