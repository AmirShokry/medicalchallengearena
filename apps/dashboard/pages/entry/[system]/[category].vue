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
useSeoMeta({
  title: `MCA | ${params.value.system} ${params.value.category} `,
  description: "Create and manage entries for the medical challenge arena.",
});
const { isMobile, setOpen } = useSidebar();
const { $trpc } = useNuxtApp();
const activeCaseType = ref<CaseTypes>(ENTRY_PREFERENCES.value.CASE_TYPE);
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
