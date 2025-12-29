import { TRPCClientError } from "@trpc/client";
import type { Block, CaseTypes } from "@/components/entry/Input/Index.vue";
export const usePreviewStore = defineStore("preview", () => {
  const preview = ref<Block>([]);
  const error = ref<string | null>(null);
  const pending = ref(false);
  const editedCaseIndex = ref<number | null>(null);
  const searchQuery = ref("");
  const scrollToTopTrigger = ref(0);

  const isEditing = computed(() => editedCaseIndex.value !== null);
  const previewSectionRef = ref(null as HTMLElement | null);

  // Filter preview based on search query
  const filteredPreview = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) return preview.value;

    return preview.value.filter((caseItem) => {
      // Search in case body
      if (caseItem.body.toLowerCase().includes(query)) return true;

      // Search in questions
      for (const question of caseItem.questions) {
        if (question.body.toLowerCase().includes(query)) return true;
        if (question.explanation?.toLowerCase().includes(query)) return true;

        // Search in choices
        for (const choice of question.choices) {
          if (choice.body.toLowerCase().includes(query)) return true;
          if (choice.explanation?.toLowerCase().includes(query)) return true;
        }
      }
      return false;
    });
  });

  const isSearching = computed(() => searchQuery.value.trim().length > 0);

  const isEmpty = computed(
    () =>
      error.value ||
      (!pending.value && (!preview || preview.value.length === 0))
  );

  const noSearchResults = computed(
    () =>
      isSearching.value && filteredPreview.value.length === 0 && !isEmpty.value
  );

  // Get the original index from the full preview array for an item
  function getOriginalIndex(item: Block[number] | undefined): number {
    if (!item) return -1;
    return preview.value.findIndex((p) => p.id === item.id);
  }

  const { $trpc } = useNuxtApp();

  async function fetchPreviewData({
    system,
    category,
    caseType,
  }: {
    system: string;
    category: string;
    caseType: CaseTypes;
  }) {
    console.log("Fetching preview data for:", { system, category, caseType });
    pending.value = true;
    error.value = null;
    searchQuery.value = ""; // Clear search on fetch
    editedCaseIndex.value = null; // Reset edit state when fetching new data
    try {
      preview.value = await $trpc.block.get.query({
        system,
        category,
        caseType,
      });
    } catch (e) {
      if (e instanceof TRPCClientError) error.value = e.message;
      preview.value = [];
      error.value = "Failed to fetch preview data.";
    } finally {
      pending.value = false;
    }
  }

  async function addData(data: Block[number]) {
    error.value = null; //Because DynamicScroller doesn't render on error & if list empty error is thrown.
    pending.value = false;
    preview.value.unshift(data);
    // Trigger scroll to top after adding new data
    scrollToTopTrigger.value++;
  }
  async function deleteCase(index: number | null) {
    if (index === null || index >= preview.value.length) return;
    preview.value.splice(index, 1);
    if (editedCaseIndex.value === index) editedCaseIndex.value = null;
  }

  function clearSearch() {
    searchQuery.value = "";
  }

  return {
    preview,
    filteredPreview,
    searchQuery,
    isSearching: readonly(isSearching),
    noSearchResults: readonly(noSearchResults),
    scrollToTopTrigger: readonly(scrollToTopTrigger),
    fetchPreviewData,
    editedCaseIndex,
    isEmpty,
    isEditing: readonly(isEditing),
    pending: readonly(pending),
    error: readonly(error),
    addData,
    deleteCase,
    getOriginalIndex,
    clearSearch,
  };
});
