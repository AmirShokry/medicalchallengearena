<script setup lang="ts">
import {
  type CaseTypes,
  ENTRY_PREFERENCES,
  CASE_TYPES,
} from "@/components/entry/Input/Index.vue";
import {
  activeContentName,
  setActiveContent,
} from "~/components/sidebars/default/utils";
import { useSidebar } from "~/components/ui/sidebar/utils";
import { SearchIcon, XIcon } from "lucide-vue-next";

definePageMeta({
  middleware: "valid-entry-params",
});
const params = computed(() => useRoute("entry-system-category").params);
const route = useRoute("entry-system-category");
useSeoMeta({
  title: `MCA | ${params.value.system} ${params.value.category} `,
  description: "Create and manage entries for the medical challenge arena.",
});
const { isMobile, setOpen } = useSidebar();
const { $trpc } = useNuxtApp();

// Allow `?caseType=STEP 2` to override the persisted preference
// (used when navigating in from the search page).
const queryCaseType = (route.query.caseType as string | undefined) ?? null;
const initialCaseType: CaseTypes = (
  CASE_TYPES.includes(queryCaseType as CaseTypes)
    ? queryCaseType
    : ENTRY_PREFERENCES.value.CASE_TYPE
) as CaseTypes;

const activeCaseType = ref<CaseTypes>(initialCaseType);
const inputStore = useInputStore();
const previewStore = usePreviewStore();
usePreviewStore().editedCaseIndex = null;
inputStore.resetInput();

if (activeContentName.value !== "ContentEntry")
  setActiveContent("ContentEntry", {
    defaultActiveSystem: params.value.system,
    defaultActiveCategory: params.value.category,
  });

setOpen(ENTRY_PREFERENCES.value.IS_SIDEBAR_OPEN);

const { data: category_id } = await $trpc.common.getCategoryIdByName.useQuery({
  category: params.value.category,
});
inputStore.activeCategoryId = category_id.value;

// Watch for case type changes and reset edit state
watch(activeCaseType, () => {
  previewStore.editedCaseIndex = null;
  inputStore.resetInput();
});

// If the user came from /search with ?editCaseId=…, pre-select that case
// once the preview store finishes loading.
const pendingEditCaseId = route.query.editCaseId
  ? Number(route.query.editCaseId)
  : null;
const pendingQuestionId = route.query.questionId
  ? Number(route.query.questionId)
  : null;
const pendingChoiceId = route.query.choiceId
  ? Number(route.query.choiceId)
  : null;
const pendingMatchedField =
  (route.query.matchedField as "body" | "explanation" | undefined) ?? null;

if (pendingEditCaseId != null && !Number.isNaN(pendingEditCaseId)) {
  let stop: (() => void) | null = null;
  stop = watch(
    () => [previewStore.pending, previewStore.preview.length] as const,
    ([isPending, len]) => {
      if (isPending) return;
      if (len === 0) {
        stop?.();
        return;
      }
      const idx = previewStore.preview.findIndex(
        (c) => c.id === pendingEditCaseId
      );
      if (idx === -1) {
        stop?.();
        return;
      }
      previewStore.editedCaseIndex = idx;
      inputStore.setInput(structuredClone(toRaw(previewStore.preview[idx])));

      // After the case is loaded into the editor, ask the editor to
      // scroll to / spotlight the specific question or choice (if any).
      if (pendingQuestionId != null && !Number.isNaN(pendingQuestionId)) {
        nextTick(() => {
          inputStore.setHighlightTarget({
            questionId: pendingQuestionId,
            choiceId:
              pendingChoiceId != null && !Number.isNaN(pendingChoiceId)
                ? pendingChoiceId
                : null,
            revealExplanation: pendingMatchedField === "explanation",
          });
        });
      }

      // strip the query so a refresh doesn't re-trigger
      navigateTo(
        {
          path: route.path,
          query: {
            ...route.query,
            editCaseId: undefined,
            questionId: undefined,
            choiceId: undefined,
            matchedField: undefined,
          },
        },
        { replace: true }
      );
      stop?.();
    },
    { immediate: true }
  );
}
</script>

<template>
  <div class="flex flex-col min-h-0 h-dvh">
    <header
      class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-border/30"
    >
      <div class="flex items-center gap-2 px-4 flex-1">
        <SidebarTrigger class="-ml-1" />
        <Separator
          orientation="vertical"
          class="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList class="!flex-nowrap">
            <BreadcrumbItem class="max-sm:hidden"
              >{{ params.system }}
            </BreadcrumbItem>
            <BreadcrumbSeparator class="max-sm:hidden" />
            <BreadcrumbItem>{{ params.category }}</BreadcrumbItem>
            <BreadcrumbItem>
              <Select v-model="activeCaseType">
                <SelectTrigger
                  class="cursor-pointer mx-1 !h-6 !bg-featured text-primary"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="examType in CASE_TYPES"
                    class="cursor-pointer"
                    :key="examType"
                    :value="examType"
                  >
                    {{ examType }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <!-- Search Bar -->
      <div class="flex items-center gap-2 px-4">
        <div class="relative w-64 max-sm:w-40">
          <SearchIcon
            class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
          />
          <Input
            v-model="previewStore.searchQuery"
            type="text"
            placeholder="Search blocks..."
            class="pl-8 pr-8 h-8 text-sm"
          />
          <Button
            v-if="previewStore.isSearching"
            @click="previewStore.clearSearch"
            variant="ghost"
            size="sm"
            class="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0 cursor-pointer"
          >
            <XIcon class="h-3.5 w-3.5" />
          </Button>
        </div>
        <span
          v-if="previewStore.isSearching"
          class="text-xs text-muted-foreground whitespace-nowrap max-sm:hidden"
        >
          {{ previewStore.filteredPreview.length }} found
        </span>
      </div>
    </header>
    <ResizablePanelGroup :direction="isMobile ? 'vertical' : 'horizontal'">
      <ResizablePanel :default-size="ENTRY_PREFERENCES.INPUT_PANEL_SIZE[0]">
        <EntryInput
          :system="params.system"
          :category="params.category"
          :case-type="activeCaseType"
        />
      </ResizablePanel>
      <ResizableHandle with-handle />
      <ResizablePanel>
        <EntryPreviewRoot
          :system="params.system"
          :category="params.category"
          :case-type="activeCaseType"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
