<script lang="ts">
export const iframeHeight = "800px";
export const description = "A left and right sidebar.";
</script>

<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UsersIcon } from "lucide-vue-next";
import { Separator } from "@/components/ui/separator";
import useSocial from "@/composables/useSocial";

const {} = useAuth();
definePageMeta({
  layout: "lobby",
});
useSeoMeta({
  title: "MCA | Lobby",
  description: "Welcome to the MCA lobby, where you can start your game.",
});

const audio = useAudioStore();
const router = useRouter();

// Set user status to online when entering lobby
const social = useSocial();
social.setStatus("online");

const { user, isLoading } = storeToRefs(useUserStore());
const { $trpc } = useNuxtApp();
const { data: ranks, pending: areRanksPending } = useLazyAsyncData(
  "ranks",
  () => $trpc.common.ranks.query({ limit: 6 }),
  {
    server: true,
    default: () => [],
  }
);

const isPlayClicked = ref(false);

const userStats = computed(() => {
  if (!user.value) return null;

  const userData = user.value;
  return {
    winRate:
      userData.gamesTotal && userData.gamesTotal > 0
        ? (userData.gamesWon! / userData.gamesTotal) * 100
        : 0,
    correctRate:
      userData.questionsTotal && userData.questionsTotal > 0
        ? (userData.questionsCorrect! / userData.questionsTotal) * 100
        : 0,
  };
});

function listenForEscape(event: KeyboardEvent) {
  const key = event.key;
  if (key === "Escape") isPlayClicked.value = false;
}
function handlePlayClick() {
  window.addEventListener("keydown", listenForEscape);

  audio.navigation.play();
  isPlayClicked.value = true;
}

function handleSoloClick() {
  audio.navigation.play();
  router.push({ name: "game-setup-solo" });
}
function handleMultiClick() {
  audio.navigation.play();
  router.push({ name: "game-setup-multi" });
}
onUnmounted(() => window.removeEventListener("keydown", listenForEscape));
</script>

<template>
  <header
    class="sticky top-0 flex h-10 shrink-0 items-center gap-2 bg-background"
  >
    <div class="flex flex-1 items-center gap-2 px-3">
      <SidebarTrigger side="left" class="cursor-pointer" />
      <SidebarTrigger side="right" class="cursor-pointer ml-auto max-lg:mr-1">
        <UsersIcon />
      </SidebarTrigger>
    </div>
  </header>

  <div class="flex flex-1 flex-col gap-4 px-4 pt-1 m-10">
    <div
      class="min-h-full w-full rounded-xl gap-10 grid [grid-template-areas:'play_ranks''stats_progress'] grid-cols-[1fr_0.6fr] grid-rows-[1fr_0.3fr] max-xl:grid-cols-1 max-xl:grid-rows-[repeat(auto,minmax(0,1fr))] max-xl:[grid-template-areas:'play''ranks''stats''progress']"
    >
      <div
        class="[grid-area:play] rounded-2xl relative flex items-center min-h-[300px]"
      >
        <div
          class="absolute rounded-2xl inset-0 bg-[url(/assets/images/house-scrub.png)] bg-no-repeat bg-[center_-14rem] grayscale h-full w-full z-0"
        />
        <!-- <div
          class="absolute rounded-2xl inset-0 bg-[url(/assets/images/campaign.webp)] bg-no-repeat h-full w-full z-0"
        /> -->

        <!-- <div
          class="flex w-full h-full items-end min-[950px]:items-center justify-end max-[950px]:justify-center max-[950px]:mr-0 mr-10 z-1 gap-2"
        > -->
        <div class="flex w-full items-center justify-center z-1 gap-2">
          <!-- <Button
            v-if="!isPlayClicked"
            @click="handlePlayClick"
            class="not-dark:text-primary mt-20 cursor-pointer border-border border w-1/4 h-10 [background:linear-gradient(80deg,_rgba(187,77,0,0.25)_1%,_rgba(255,255,255,1)_30%)]"
          > -->
          <Button
            v-if="!isPlayClicked"
            @click="handlePlayClick"
            class="text-primary-foreground mt-20 cursor-pointer border-border border w-1/4 h-10 [background:linear-gradient(80deg,_rgba(187,77,0,0.25)_1%,_rgba(217,166,72,1)_30%)]"
          >
            Play
          </Button>
          <!-- <Button
            v-if="isPlayClicked"
            @click="handleSoloClick"
            class="hover:![background:#FFFF] not-dark:hover:![background:black] text-primary-foreground mt-20 cursor-pointer border-border border w-1/6 h-10 [background:linear-gradient(80deg,_#B1AFB3_1%,_#B1AFB3_30%)]"
          > -->
          <Button
            v-if="isPlayClicked"
            @click="handleSoloClick"
            class="hover:![background:#FFFF] not-dark:hover:![background:black] text-primary-foreground mt-20 cursor-pointer border-border border w-1/4 h-10 [background:linear-gradient(80deg,_#B1AFB3_1%,_#B1AFB3_30%)]"
          >
            Solo
          </Button>
          <!-- <Button
            v-if="isPlayClicked"
            @click="handleMultiClick"
            class="hover:![background:#FFFF] not-dark:hover:![background:black] text-primary-foreground mt-20 cursor-pointer border-border border w-1/6 h-10 [background:linear-gradient(80deg,_#B1AFB3_1%,_#B1AFB3_30%)]"
          >
            Multi
          </Button> -->
          <Button
            v-if="isPlayClicked"
            @click="handleMultiClick"
            class="hover:![background:#FFFF] not-dark:hover:![background:black] text-primary-foreground mt-20 cursor-pointer border-border border w-1/4 h-10 [background:linear-gradient(80deg,_#B1AFB3_1%,_#B1AFB3_30%)]"
          >
            Multi
          </Button>
        </div>
      </div>
      <div class="[grid-area:ranks] rounded-2xl border shadow-xl pt-1 px-6">
        <div class="w-full h-full p-6 rounded-2xl">
          <h1
            class="text-3xl font-bold text-center text-orange-500 mb-6 truncate"
          >
            🏆 Rankings
          </h1>
          <div
            v-if="areRanksPending"
            class="h-82 flex items-center justify-center"
          >
            Loading ranks...
          </div>
          <Table v-else class="justify-self-center">
            <TableHeader>
              <TableRow>
                <TableHead class="w-[100px] text-center"> Rank </TableHead>
                <TableHead>Name</TableHead>
                <TableHead class="text-center"> Medpoints </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                class="hover:bg-muted"
                v-for="(user, index) in ranks"
                :key="user.rank"
              >
                <TableCell class="font-medium text-center">
                  {{
                    index + 1 === 1
                      ? "🥇"
                      : index + 1 === 2
                        ? "🥈"
                        : index + 1 === 3
                          ? "🥉"
                          : index + 1
                  }}
                </TableCell>
                <TableCell class="flex items-center">
                  <UiAvatar class="max-lg:hidden">
                    <UiAvatarImage
                      :src="`https://robohash.org/${user.username}`"
                    />
                  </UiAvatar>
                  <p class="mt-2 max-w-30 truncate">
                    {{ user.username }}
                  </p>
                </TableCell>
                <TableCell class="text-center">
                  {{ user.medPoints }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div class="[grid-area:stats] rounded-2xl bg-muted/50 h-fit">
        <div v-if="isLoading" class="flex items-center justify-center p-8">
          <p>Loading...</p>
        </div>
        <div v-else-if="user" class="flex flex-col px-6 py-4">
          <div class="flex items-center gap-4">
            <UiAvatar>
              <UiAvatarImage
                :src="user.avatarUrl || `https://robohash.org/${user.username}`"
                class="rounded-full w-full h-full object-cover object-center"
              />
            </UiAvatar>

            <Separator orientation="vertical" class="border !h-20" />

            <div class="flex flex-col">
              <p class="font-semibold leading-tight">
                {{ user.username }}
              </p>
              <p class="text-sm text-muted-foreground leading-tight">
                <span class="bg-orange-500 text-primary rounded-lg px-1 text-xs"
                  >MP</span
                >
                {{ user.medPoints }}
              </p>
              <p class="text-sm text-muted-foreground leading-tight">
                Rank: #{{ user.rank }}
              </p>
            </div>
          </div>
          <Separator orientation="horizontal" class="border mb-6" />
          <div class="flex flex-col gap-4 h-full px-6">
            <div class="flex flex-col h-full">
              <div class="flex items-center gap-2">
                <span class="text-sm basis-1/6">Wining Rate: </span>
                <UiProgress
                  class="flex-1"
                  :model-value="userStats?.winRate || 0"
                >
                </UiProgress>
                <span class="text-sm basis-1/9 text-right truncate"
                  >{{ user.gamesWon || 0 }} /
                  {{ user.gamesTotal || 0 }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm basis-1/6">Correct Questions: </span>
              <UiProgress
                class="flex-1"
                :model-value="userStats?.correctRate || 0"
              >
              </UiProgress>
              <span class="text-sm basis-1/9 text-right triuncate"
                >{{ user.questionsCorrect || 0 }} /
                {{ user.questionsTotal || 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="[grid-area:progress] rounded-2xl bg-muted/50 pb-10">
        <p class="font-bold text-center p-4">Your Daily Stats</p>
        <Separator orientation="horizontal" class="border mb-6" />
        <div class="flex items-center gap-2 px-10 my-2">
          <p class="text-sm w-full">Medpoints Gained:</p>
          <p class="text-sm text-end w-full">200 MP</p>
        </div>
        <div class="flex items-center gap-2 px-10 my-2">
          <p class="text-sm w-full">Questions Solved:</p>
          <p class="text-sm text-end w-full">100 Q</p>
        </div>
        <div class="flex items-center gap-2 px-10">
          <span class="text-sm basis-1/5">Games Won: </span>
          <UiProgress class="flex-1" :model-value="userStats?.winRate || 0">
          </UiProgress>
          <span class="text-sm basis-1/9 text-right">10/200</span>
        </div>
      </div>
    </div>
  </div>
</template>
