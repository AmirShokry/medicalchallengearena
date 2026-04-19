<script setup lang="ts">
import {
  SearchIcon,
  XIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
  FileTextIcon,
  HelpCircleIcon,
  ListIcon,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
import type { CaseTypes } from "@/components/entry/Input/Index.vue";

useSeoMeta({
  title: "MCA | Search",
  description: "Full-text search across cases, questions and choices.",
});

type Scope =
  | "all"
  | "case"
  | "question"
  | "choice"
  | "explanation"
  | "choice_explanation";

const { $trpc } = useNuxtApp();
const router = useRouter();

// --- filter state ----------------------------------------------------------
const searchQuery = ref("");
const debouncedQuery = ref("");
const scope = ref<Scope>("all");
const selectedSystemId = ref<number | null>(null);
const selectedCategoryId = ref<number | null>(null);
const selectedCaseType = ref<CaseTypes | null>(null);
const offset = ref(0);
const limit = ref(20);

// debounce search input
let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, (v) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    debouncedQuery.value = v.trim();
    offset.value = 0;
  }, 300);
});

// reset pagination whenever filters change
watch([scope, selectedSystemId, selectedCategoryId, selectedCaseType], () => {
  offset.value = 0;
});

// when system changes, clear category filter
watch(selectedSystemId, () => {
  selectedCategoryId.value = null;
});

// --- systems / categories for the filter selects ---------------------------
const { data: systemsData } = $trpc.systems.getAll.useQuery();

const systemOptions = computed(() => systemsData.value ?? []);
const categoryOptions = computed(() => {
  if (selectedSystemId.value == null) return [];
  return (
    systemsData.value?.find((s) => s.id === selectedSystemId.value)
      ?.categories ?? []
  );
});

// --- search query ----------------------------------------------------------
const searchEnabled = computed(() => debouncedQuery.value.length > 0);

// trpc-nuxt's useQuery auto-refetches on reactive input changes. When the
// search box is empty we send a token that won't match anything; the UI
// gates on `searchEnabled` so results are never shown for that token.
const EMPTY_TOKEN = "__mca_no_match_token__";

const {
  data: searchData,
  pending,
  refresh,
} = $trpc.search.list.useQuery(
  computed(() => ({
    q: debouncedQuery.value || EMPTY_TOKEN,
    scope: scope.value,
    systemId: selectedSystemId.value,
    categoryId: selectedCategoryId.value,
    caseType: selectedCaseType.value,
    offset: offset.value,
    limit: limit.value,
  }))
);

const results = computed(() =>
  searchEnabled.value ? searchData.value?.results ?? [] : []
);
const totalCount = computed(() => searchData.value?.totalCount ?? 0);
const perKindCounts = computed(() => searchData.value?.perKindCounts);
const hasMore = computed(() => searchData.value?.hasMore ?? false);
const currentPage = computed(() => searchData.value?.currentPage ?? 1);
const totalPages = computed(() => searchData.value?.totalPages ?? 1);

const canGoPrev = computed(() => offset.value > 0);
const canGoNext = computed(() => hasMore.value);

function nextPage() {
  if (hasMore.value) offset.value += limit.value;
}
function prevPage() {
  if (offset.value > 0) offset.value = Math.max(0, offset.value - limit.value);
}

// --- highlight matched substring -------------------------------------------
// Best-effort highlighting: since the backend uses Postgres FTS (with
// stemming) the exact query string isn't guaranteed to appear verbatim.
// We highlight any of the query's word-tokens instead.
function highlight(text: string | null | undefined): string {
  if (!text) return "";
  const escaped = escapeHtml(text);
  const tokens = debouncedQuery.value
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => escapeRegex(escapeHtml(t)));
  if (tokens.length === 0) return escaped;
  const re = new RegExp(`(${tokens.join("|")})`, "gi");
  return escaped.replace(
    re,
    '<mark class="bg-yellow-300/60 text-foreground rounded-sm px-0.5">$1</mark>'
  );
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const KIND_META: Record<
  "case" | "question" | "choice",
  { label: string; color: string; icon: any }
> = {
  case: {
    label: "Case",
    color: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    icon: FileTextIcon,
  },
  question: {
    label: "Question",
    color: "bg-violet-500/15 text-violet-600 border-violet-500/30",
    icon: HelpCircleIcon,
  },
  choice: {
    label: "Choice",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    icon: ListIcon,
  },
};

// --- actions ---------------------------------------------------------------
function editResult(r: (typeof results.value)[number]) {
  if (!r.systemName || !r.categoryName) {
    toast.error("This case has no system / category and cannot be opened.");
    return;
  }
  const query: Record<string, string> = {
    caseType: r.caseType,
    editCaseId: String(r.caseId),
    matchedField: r.matchedField,
  };
  if (r.questionId != null) query.questionId = String(r.questionId);
  if (r.choiceId != null) query.choiceId = String(r.choiceId);

  router.push({
    path: `/entry/${encodeURIComponent(r.systemName)}/${encodeURIComponent(
      r.categoryName
    )}`,
    query,
  });
}

const deleting = ref(false);
const deleteTarget = ref<(typeof results.value)[number] | null>(null);
const showDeleteDialog = ref(false);

function askDelete(r: (typeof results.value)[number]) {
  deleteTarget.value = r;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await $trpc.search.deleteCase.mutate({
      caseId: deleteTarget.value.caseId,
    });
    toast.success(`Case #${deleteTarget.value.caseId} deleted.`);
    showDeleteDialog.value = false;
    deleteTarget.value = null;
    await refresh();
  } catch (e: any) {
    toast.error(e?.message ?? "Failed to delete case.");
  } finally {
    deleting.value = false;
  }
}

function clearAllFilters() {
  scope.value = "all";
  selectedSystemId.value = null;
  selectedCategoryId.value = null;
  selectedCaseType.value = null;
}
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
          <BreadcrumbItem>
            <BreadcrumbLink>Search</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>

  <main class="flex flex-1 flex-col gap-4 p-4 px-10 xl:px-20 pt-6 min-h-0">
    <div class="bg-muted/50 px-6 py-6 rounded-xl flex flex-col gap-5 min-h-0">
      <!-- Filters row -->
      <div class="flex flex-col gap-3">
        <div class="relative w-full">
          <SearchIcon
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search cases, questions, choices..."
            class="pl-10 pr-10 h-11 text-base"
          />
          <Button
            v-if="searchQuery"
            @click="searchQuery = ''"
            variant="ghost"
            size="sm"
            class="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 cursor-pointer"
          >
            <XIcon class="h-4 w-4" />
          </Button>
        </div>

        <div class="flex flex-wrap gap-2 items-center">
          <div class="flex flex-col gap-1 min-w-[180px]">
            <Label class="text-xs text-muted-foreground">Search in</Label>
            <Select v-model="scope">
              <SelectTrigger class="cursor-pointer h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everywhere</SelectItem>
                <SelectItem value="case">Cases</SelectItem>
                <SelectItem value="question">Questions</SelectItem>
                <SelectItem value="choice">Choices</SelectItem>
                <SelectItem value="explanation">Explanations</SelectItem>
                <SelectItem value="choice_explanation">
                  Choice explanations
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col gap-1 min-w-[160px]">
            <Label class="text-xs text-muted-foreground">System</Label>
            <Select
              :model-value="
                selectedSystemId == null ? '__all__' : String(selectedSystemId)
              "
              @update:model-value="
                (v: any) =>
                  (selectedSystemId = v === '__all__' ? null : Number(v))
              "
            >
              <SelectTrigger class="cursor-pointer h-9">
                <SelectValue placeholder="All systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All systems</SelectItem>
                <SelectItem
                  v-for="s in systemOptions"
                  :key="s.id"
                  :value="String(s.id)"
                >
                  {{ s.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col gap-1 min-w-[180px]">
            <Label class="text-xs text-muted-foreground">Category</Label>
            <Select
              :disabled="selectedSystemId == null"
              :model-value="
                selectedCategoryId == null
                  ? '__all__'
                  : String(selectedCategoryId)
              "
              @update:model-value="
                (v: any) =>
                  (selectedCategoryId = v === '__all__' ? null : Number(v))
              "
            >
              <SelectTrigger class="cursor-pointer h-9">
                <SelectValue
                  :placeholder="
                    selectedSystemId == null
                      ? 'Pick a system first'
                      : 'All categories'
                  "
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                <SelectItem
                  v-for="c in categoryOptions"
                  :key="c.id"
                  :value="String(c.id)"
                >
                  {{ c.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col gap-1 min-w-[140px]">
            <Label class="text-xs text-muted-foreground">Step</Label>
            <Select
              :model-value="selectedCaseType ?? '__all__'"
              @update:model-value="
                (v: any) => (selectedCaseType = v === '__all__' ? null : v)
              "
            >
              <SelectTrigger class="cursor-pointer h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All steps</SelectItem>
                <SelectItem value="STEP 1">STEP 1</SelectItem>
                <SelectItem value="STEP 2">STEP 2</SelectItem>
                <SelectItem value="STEP 3">STEP 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col gap-1">
            <Label class="text-xs text-transparent select-none">.</Label>
            <Button
              variant="outline"
              size="sm"
              class="h-9"
              @click="clearAllFilters"
            >
              Reset filters
            </Button>
          </div>
        </div>

        <!-- Per-kind counts when scope=all -->
        <div
          v-if="searchEnabled && perKindCounts"
          class="flex flex-wrap gap-2 text-xs text-muted-foreground"
        >
          <span
            class="px-2 py-0.5 rounded-md border"
            :class="KIND_META.case.color"
          >
            {{ perKindCounts.case }} cases
          </span>
          <span
            class="px-2 py-0.5 rounded-md border"
            :class="KIND_META.question.color"
          >
            {{ perKindCounts.question }} questions
          </span>
          <span
            class="px-2 py-0.5 rounded-md border"
            :class="KIND_META.choice.color"
          >
            {{ perKindCounts.choice }} choices
          </span>
          <span class="ml-auto"
            >Showing top {{ Math.max(5, Math.floor(limit / 3)) }} of each
            kind</span
          >
        </div>
      </div>

      <!-- Empty state: no query -->
      <div
        v-if="!searchEnabled"
        class="flex flex-col items-center justify-center py-16 text-muted-foreground"
      >
        <SearchIcon class="w-10 h-10 mb-3 opacity-40" />
        <p class="text-sm">
          Type something above to search cases, questions and choices.
        </p>
      </div>

      <!-- Loading -->
      <div
        v-else-if="pending && results.length === 0"
        class="flex items-center justify-center py-16"
      >
        <Loader2Icon class="w-6 h-6 animate-spin text-muted-foreground" />
      </div>

      <!-- No results -->
      <div
        v-else-if="results.length === 0"
        class="flex flex-col items-center justify-center py-16 text-muted-foreground"
      >
        <p class="text-sm">No matches for “{{ debouncedQuery }}”.</p>
      </div>

      <!-- Results table -->
      <div v-else class="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[110px]">Type</TableHead>
              <TableHead>Match</TableHead>
              <TableHead class="w-[220px]">Location</TableHead>
              <TableHead class="w-[90px]">Step</TableHead>
              <TableHead class="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(r, i) in results"
              :key="`${r.kind}-${r.caseId}-${r.questionId ?? 'q'}-${
                r.choiceId ?? 'c'
              }-${i}`"
              class="hover:bg-accent/40"
            >
              <TableCell>
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium"
                  :class="KIND_META[r.kind].color"
                >
                  <component :is="KIND_META[r.kind].icon" class="w-3 h-3" />
                  {{ KIND_META[r.kind].label }}
                </span>
              </TableCell>
              <TableCell class="max-w-0">
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <span
                      v-if="r.matchedField === 'explanation'"
                      class="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 border border-amber-500/30 shrink-0"
                      title="Match was found in the explanation field"
                    >
                      Explanation
                    </span>
                    <div
                      class="text-sm line-clamp-2 break-words flex-1"
                      v-html="highlight(r.matchedText)"
                    />
                  </div>
                  <div
                    v-if="r.kind !== 'case'"
                    class="text-[11px] text-muted-foreground line-clamp-1 break-words"
                    :title="r.caseBody"
                  >
                    Case #{{ r.caseId }}: {{ r.caseBody }}
                  </div>
                </div>
              </TableCell>
              <TableCell class="text-xs">
                <div class="font-medium">{{ r.systemName ?? "—" }}</div>
                <div class="text-muted-foreground">
                  {{ r.categoryName ?? "—" }}
                </div>
              </TableCell>
              <TableCell class="text-xs">{{ r.caseType }}</TableCell>
              <TableCell class="text-right">
                <div class="inline-flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 px-2 cursor-pointer"
                    title="Open in editor"
                    @click="editResult(r)"
                  >
                    <PencilIcon class="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 px-2 cursor-pointer text-destructive hover:text-destructive"
                    title="Delete entire case"
                    @click="askDelete(r)"
                  >
                    <Trash2Icon class="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <!-- Pagination (only when scope is single) -->
        <div
          v-if="scope !== 'all'"
          class="flex items-center mt-8 w-full text-sm"
        >
          <div class="text-muted-foreground">
            {{ totalCount === 0 ? 0 : offset + 1 }} to
            {{ Math.min(offset + limit, totalCount) }} of {{ totalCount }}
          </div>
          <div class="flex items-center flex-1 justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="!canGoPrev || pending"
              @click="prevPage"
            >
              Previous
            </Button>
            <span class="text-muted-foreground px-2">
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
    </div>
  </main>

  <!-- Delete confirmation -->
  <Dialog v-model:open="showDeleteDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete case?</DialogTitle>
        <DialogDescription>
          This will permanently delete
          <span class="font-semibold">case #{{ deleteTarget?.caseId }}</span>
          including all of its questions and choices. This action cannot be
          undone.
        </DialogDescription>
      </DialogHeader>
      <div
        v-if="deleteTarget"
        class="text-xs bg-muted/60 rounded-md p-3 max-h-32 overflow-auto"
      >
        {{ deleteTarget.caseBody }}
      </div>
      <DialogFooter>
        <DialogClose as-child>
          <Button variant="outline" :disabled="deleting">Cancel</Button>
        </DialogClose>
        <Button
          variant="destructive"
          :disabled="deleting"
          @click="confirmDelete"
        >
          <Loader2Icon v-if="deleting" class="w-4 h-4 mr-1 animate-spin" />
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
