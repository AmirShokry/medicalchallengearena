<script setup lang="ts">
import { ArrowLeft, Gamepad2 } from "lucide-vue-next";

const route = useRoute("users-id-games");
const router = useRouter();
const { $trpc } = useNuxtApp();

const userId = computed(() => Number(route.params.id));
const currentPage = ref(0);
const activeMode = ref<"unranked" | "single" | undefined>(undefined);

// User data
const { data: user } = $trpc.users.getById.useQuery(
  computed(() => ({ userId: userId.value }))
);

// Games data
const {
  data: gamesData,
  pending,
  refresh,
} = $trpc.users.getGames.useQuery(
  computed(() => ({
    userId: userId.value,
    page: currentPage.value,
    mode: activeMode.value,
  }))
);

const records = computed(() => gamesData.value?.records || []);
const hasMore = computed(() => gamesData.value?.hasMore || false);
const totalCount = computed(() => gamesData.value?.totalCount || 0);
const currentPageDisplay = computed(() => gamesData.value?.currentPage || 1);
const totalPages = computed(() => gamesData.value?.totalPages || 1);

const goBack = () => {
  router.push({ name: "users-id", params: { id: userId.value } });
};

const goToReview = (gameId: number) => {
  router.push({
    name: "users-id-games-gameId",
    params: { id: userId.value, gameId },
  });
};

const nextPage = () => {
  if (hasMore.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
  }
};

const setMode = (mode: "unranked" | "single" | undefined) => {
  activeMode.value = mode;
  currentPage.value = 0;
};

// Format duration helper
const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Format date helper
const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>

<template>
  <header
    class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
  >
    <div class="flex items-center gap-2 px-4">
      <SidebarTrigger class="-ml-1" />
      <Separator
        orientation="vertical"
        class="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem class="hidden md:block">
            <BreadcrumbLink
              class="cursor-pointer"
              @click="() => router.push({ name: 'users' })"
            >
              Users
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator class="hidden md:block" />
          <BreadcrumbItem class="hidden md:block">
            <BreadcrumbLink class="cursor-pointer" @click="goBack">
              {{ user?.username || "User" }}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator class="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbLink> Games </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>

  <main class="flex flex-1 flex-col gap-4 p-4 px-10 md:px-40 pt-10">
    <!-- Back button -->
    <Button variant="ghost" size="sm" class="w-fit" @click="goBack">
      <ArrowLeft class="w-4 h-4 mr-2" />
      Back to {{ user?.username || "User" }}
    </Button>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <Gamepad2 class="w-6 h-6" />
        Games for {{ user?.username || "User" }}
      </h1>
      <span class="text-muted-foreground">{{ totalCount }} total games</span>
    </div>

    <!-- Mode filters -->
    <div class="flex gap-2">
      <Button
        :variant="activeMode === undefined ? 'default' : 'outline'"
        size="sm"
        @click="setMode(undefined)"
      >
        All
      </Button>
      <Button
        :variant="activeMode === 'unranked' ? 'default' : 'outline'"
        size="sm"
        @click="setMode('unranked')"
      >
        Multi
      </Button>
      <Button
        :variant="activeMode === 'single' ? 'default' : 'outline'"
        size="sm"
        @click="setMode('single')"
      >
        Solo
      </Button>
    </div>

    <!-- Games table -->
    <div v-if="pending" class="flex items-center justify-center py-8 h-full">
      <div class="text-muted-foreground animated-spin">...</div>
    </div>
    <Card v-else>
      <CardContent class="pt-6">
        <div
          v-if="records.length === 0"
          class="flex items-center justify-center py-8"
        >
          <div class="text-muted-foreground">No games found.</div>
        </div>

        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Game ID</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Opponent</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="record in records"
              :key="record.gameId"
              class="cursor-pointer hover:bg-accent"
              @click="goToReview(record.gameId)"
            >
              <TableCell class="font-medium">#{{ record.gameId }}</TableCell>
              <TableCell>
                <span
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium capitalize',
                    record.mode === 'ranked'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
                      : record.mode === 'unranked'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
                  ]"
                >
                  {{
                    record.mode === "unranked"
                      ? "Multi"
                      : record.mode === "single"
                        ? "Solo"
                        : record.mode
                  }}
                </span>
              </TableCell>
              <TableCell>
                <div v-if="record.opponentId" class="flex items-center gap-2">
                  <Avatar class="w-6 h-6">
                    <AvatarImage
                      :src="record.opponentAvatarUrl!"
                      :alt="record.opponentUsername!"
                    />
                    <AvatarFallback>{{
                      record.opponentUsername?.slice(0, 2).toUpperCase()
                    }}</AvatarFallback>
                  </Avatar>
                  <span>{{ record.opponentUsername }}</span>
                </div>
                <span v-else class="text-muted-foreground">-</span>
              </TableCell>
              <TableCell>
                <span
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    record.hasWon === true
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                      : record.hasWon === false
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
                  ]"
                >
                  {{
                    record.hasWon === true
                      ? "Won"
                      : record.hasWon === false
                        ? "Lost"
                        : "Draw"
                  }}
                </span>
              </TableCell>
              <TableCell>{{ formatDuration(record.durationMs) }}</TableCell>
              <TableCell>{{ formatDate(record.date) }}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  @click.stop="goToReview(record.gameId)"
                >
                  View Review
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <!-- Pagination -->
        <div
          v-if="records.length > 0"
          class="flex items-center justify-between mt-6"
        >
          <div class="text-sm text-muted-foreground">
            Page {{ currentPageDisplay }} of {{ totalPages }}
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage === 0 || pending"
              @click="prevPage"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="!hasMore || pending"
              @click="nextPage"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </main>
</template>
