<script lang="ts">
import type { APIOutput } from "~/types/api";
import { useStorage } from "@vueuse/core";
export type Block = APIOutput["block"]["get"];
export type QuestionType = "Default" | "Tabular";
export type CaseTypes = (typeof CASE_TYPES)[number];
export const CASE_TYPES = ["STEP 1", "STEP 2", "STEP 3"] as const;
export const ENTRY_PREFERENCES = useStorage("entry-preferences", {
	CHOICES_ROWS: 4,
	CHOICES_COLUMNS: 4,
	QUESTIONS_NUMBER: 1,
	CASE_TYPE: "STEP 1" as CaseTypes,
	INPUT_PANEL_SIZE: [70],
	IS_SIDEBAR_OPEN: true,
});
export interface InputRootContext {
	data: Block[number];
}
export const [injectContext, provideContext] =
	createContext<InputRootContext>("EntryInputRoot");
</script>
<script setup lang="ts">
const randId = new Date().getTime();
const data = ref<Block[number]>({
	category_id: randId,
	id: randId,
	type: ENTRY_PREFERENCES.value.CASE_TYPE,
	body: "",
	imgUrls: [] as string[],
	questions: Array.from(
		{ length: ENTRY_PREFERENCES.value.QUESTIONS_NUMBER },
		() => {
			return {
				id: randId,
				body: "",
				imgUrls: [] as string[],
				type: "Default" as QuestionType,
				explanation: "",
				explanationImgUrls: [] as string[],
				isStudyMode: false as boolean | null,
				header: "" as string | null,
				choices: Array.from(
					{ length: ENTRY_PREFERENCES.value.CHOICES_ROWS },
					() => {
						return {
							id: randId,
							body: "",
							isCorrect: false as boolean | null,
							explanation: "" as string | null,
						};
					}
				),
			};
		}
	),
});

provideContext({
	data: data.value,
});
</script>
<template>
	<slot />
</template>
