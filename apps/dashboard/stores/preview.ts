import type { APIOutput } from "~/types/api";
import { TRPCClientError } from "@trpc/client";
type BlockData = APIOutput["block"]["get"];

export const usePreviewStore = defineStore("preview", () => {
	const preview = ref([] as BlockData);
	const error = ref<string>();
	const pending = ref(false);
	const { $trpc } = useNuxtApp();
	const isEmpty = computed(() => !preview || preview.value.length === 0);

	async function fetchPreviewData({
		system,
		category,
		caseType,
	}: {
		system: string;
		category: string;
		caseType: "STEP 1" | "STEP 2" | "STEP 3";
	}) {
		try {
			pending.value = true;
			error.value = undefined;
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
		isEmpty,
		pending: readonly(pending),
		error: readonly(error),
	};
});
