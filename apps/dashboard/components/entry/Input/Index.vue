<script lang="ts">
import { z } from "zod";
import type { APIOutput } from "@/types/api";
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
	IS_SIDEBAR_OPEN: false,
});
</script>
<script setup lang="ts">
defineProps<{
	caseType: CaseTypes;
}>();

const inputStore = useInputStore();
const previewStore = usePreviewStore();
const formRef = useTemplateRef("formRef");

const inputSchema = z.object({
	body: z.string().trim().min(1, "Case cannot be empty"),
	type: z.enum(["STEP 1", "STEP 2", "STEP 3"], {
		message: "Case type is required",
	}),
	imgUrls: z.array(z.string()).optional().default([]),
	category_id: z.number().int().nullable(),
	questions: z.array(
		z.object({
			type: z.enum(["Default", "Tabular"], {
				message: "Question type is required",
			}),
			body: z.string().trim().min(1, "Question cannot be empty"),
			header: z.string().optional().nullable(),
			imgUrls: z.array(z.string()).optional().default([]),
			isStudyMode: z.boolean().optional().nullable().default(false),
			explanation: z
				.string()
				.trim()
				.min(1, "Explanation cannot be empty"),
			explanationImgUrls: z.array(z.string()).optional().default([]),

			choices: z
				.array(
					z.object({
						body: z
							.string()
							.trim()
							.min(1, "Choice cannot be empty"),
						isCorrect: z.boolean().optional().nullable(),
						explanation: z.string().optional().nullable(),
					})
				)
				.min(2, "At least 2 choices are required")
				.refine(
					(choices) => choices.some((choice) => choice.isCorrect),
					"At least one choice must be marked as correct"
				),
		})
	),
});

function inputValidation() {
	const { success, error, data } = inputSchema.safeParse(inputStore.data);
	if (success)
		previewStore.preview.push(structuredClone(toRaw(inputStore.data)));
	else throw new Error(error.message);
}
const { $trpc } = useNuxtApp();
async function submitInput() {
	if (!formRef.value?.reportValidity()) return;
	inputValidation();
	try {
		const data = await $trpc.block.add.mutate({
			...inputStore.data,
			category_id: inputStore.activeCategoryId,
		});
		console.log(data);
		inputStore.resetInput();
	} catch (error) {
		console.error("Error submitting input:", error);
		console.log(error);
	}
}

const inputSectionRef = useTemplateRef("inputSectionRef");
watch(
	() => inputStore.data.questions.length,
	async (newLen, oldLen) => {
		if (newLen < oldLen) return;
		if (!inputSectionRef.value) return;
		if (previewStore.isEditing) return;
		await nextTick();
		inputSectionRef.value.scrollTo({
			top: inputSectionRef.value.scrollHeight + 500,
			behavior: "smooth",
		});
	}
);
</script>
<template>
	<section
		ref="inputSectionRef"
		aria-role="input-section"
		class="h-full overflow-y-scroll thin-scrollbar p-6">
		<form ref="formRef" id="submit-input" @submit.prevent="submitInput" />
		<EntryInputToolbar class="gap-2">
			<template #submit>
				<Button
					class="!h-9 !px-4 !rounded-md"
					type="submit"
					form="submit-input">
					Submit
				</Button>
			</template>
		</EntryInputToolbar>

		<EntryInputCase class="mb-4" />
		<EntryInputQuestionsBlock class="p-1 mb-4" />
	</section>
</template>
