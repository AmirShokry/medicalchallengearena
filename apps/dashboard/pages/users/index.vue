<script setup lang="ts">
import { Search } from "lucide-vue-next";

const { $trpc } = useNuxtApp();
const offset = ref(0);
const limit = ref(10);
const searchQuery = ref("");
const debouncedSearch = ref("");

// Debounce search input
let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, (newVal) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = newVal;
    offset.value = 0; // Reset to first page on search
  }, 300);
});

const {
  data: usersData,
  pending,
  refresh,
} = $trpc.common.getUsers.useQuery(
  computed(() => ({
    offset: offset.value,
    limit: limit.value,
    search: debouncedSearch.value || undefined,
  }))
);

const users = computed(() => usersData.value?.users || []);
const totalCount = computed(() => usersData.value?.totalCount || 0);
const hasMore = computed(() => usersData.value?.hasMore || false);
const currentPage = computed(() => usersData.value?.currentPage || 1);
const totalPages = computed(() => usersData.value?.totalPages || 1);

const router = useRouter();

const navigateToUser = (userId: number) => {
  router.push({ name: "users-id", params: { id: userId } });
};

const toggleSubscription = async (user: any, event: Event) => {
  event.stopPropagation();
  const newStatus = !user.isSubscribed;
  try {
    await $trpc.common.toggleSubscription.mutate({
      userId: user.id,
      isSubscribed: newStatus,
    });
    refresh();
  } catch (error) {
    console.error("Failed to toggle subscription", error);
  }
};

const nextPage = () => {
  if (hasMore.value) {
    offset.value += limit.value;
  }
};

const prevPage = () => {
  if (offset.value > 0) {
    offset.value = Math.max(0, offset.value - limit.value);
  }
};

const canGoPrev = computed(() => offset.value > 0);
const canGoNext = computed(() => hasMore.value);
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
            <BreadcrumbLink> Users </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>
  <main class="flex flex-1 flex-col gap-4 p-4 px-40 pt-10">
    <div v-if="pending" class="flex items-center justify-center py-8 h-full">
      <div class="text-muted-foreground animate-spin">...</div>
    </div>
    <div
      v-else
      class="bg-muted/50 min-h-[50vh] px-10 py-10 rounded-xl md:min-h-min"
    >
      <!-- Search Bar -->
      <div class="mb-6">
        <div class="relative max-w-md">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search by username, email, or university..."
            class="pl-10"
          />
        </div>
      </div>

      <div
        v-if="!usersData || users.length === 0"
        class="flex items-center justify-center py-8"
      >
        <div class="text-muted-foreground">No users found.</div>
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[100px]"> # </TableHead>
            <TableHead>User</TableHead>
            <TableHead>Email </TableHead>
            <TableHead>University</TableHead>
            <TableHead>Games count</TableHead>
            <TableHead>Subscribed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="(user, index) in users"
            :key="user.id"
            class="cursor-pointer hover:bg-accent"
            @click="navigateToUser(user.id)"
          >
            <TableCell class="font-medium">
              {{ offset + index + 1 }}
            </TableCell>
            <TableCell class="text-primary hover:underline font-semibold">
              {{ user.username }}
            </TableCell>
            <TableCell>
              {{ user.email }}
            </TableCell>
            <TableCell>{{ user.university }}</TableCell>
            <TableCell>{{ user.gamesTotal }}</TableCell>
            <TableCell>
              <Button
                size="sm"
                :variant="user.isSubscribed ? 'default' : 'secondary'"
                :class="
                  user.isSubscribed ? 'bg-green-600 hover:bg-green-700' : ''
                "
                @click="(e: Event) => toggleSubscription(user, e)"
              >
                {{ user.isSubscribed ? "Yes" : "No" }}
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div class="flex items-center items mt-14 w-full">
        <div class="text-sm text-muted-foreground">
          {{ offset + 1 }} to {{ Math.min(offset + limit, totalCount) }} of
          {{ totalCount }} users
        </div>
        <div class="flex items-center flex-1 justify-center mr-10 gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="!canGoPrev || pending"
            @click="prevPage"
          >
            Previous
          </Button>
          <span class="text-sm text-muted-foreground px-2">
            {{ currentPage }} of {{ totalPages }}
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="!canGoNext || pending"
            @click="nextPage"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  </main>
</template>
