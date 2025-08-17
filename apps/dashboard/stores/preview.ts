import { TRPCClientError } from "@trpc/client";
import type { Block, CaseTypes } from "@/components/entry/Input/Index.vue";
export const usePreviewStore = defineStore("preview", () => {
  const preview = ref<Block>([]);
  const error = ref<string | null>(null);
  const pending = ref(false);
  const editedCaseIndex = ref<number | null>(null);

  const isEditing = computed(() => editedCaseIndex.value !== null);
  const previewSectionRef = ref(null as HTMLElement | null);

  const isEmpty = computed(
    () =>
      error.value ||
      (!pending.value && (!preview || preview.value.length === 0))
  );

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
    error.value = null;
    pending.value = false;
    preview.value.unshift(data);
  }
  async function deleteCase(index: number | null) {
    if (index === null || index >= preview.value.length) return;
    preview.value.splice(index, 1);
    if (editedCaseIndex.value === index) editedCaseIndex.value = null;
  }
  return {
    preview,
    fetchPreviewData,
    editedCaseIndex,
    isEmpty,
    isEditing: readonly(isEditing),
    pending: readonly(pending),
    error: readonly(error),
    addData,
    deleteCase,
  };
});
