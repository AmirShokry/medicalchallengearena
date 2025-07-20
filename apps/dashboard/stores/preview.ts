import { TRPCClientError } from "@trpc/client";
import type { Block, CaseTypes } from "@/components/entry/Input/Index.vue";
export const usePreviewStore = defineStore("preview", () => {
	const preview = ref<Block>([]);
	const error = ref<string | null>(null);
	const pending = ref(false);
	const editedCaseIndex = ref<number | null>(null);
	const isEditing = computed(() => editedCaseIndex.value !== null);

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
			error.value = "Failed to fetch preview data.";
		} finally {
			pending.value = false;
		}
	}
	return {
		preview,
		fetchPreviewData,
		editedCaseIndex,
		isEmpty,
		isEditing: readonly(isEditing),
		pending: readonly(pending),
		error: readonly(error),
	};
});
