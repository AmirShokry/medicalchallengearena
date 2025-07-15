<script setup lang="ts">
import { Trash2Icon, PlusCircleIcon, NotebookPenIcon } from "lucide-vue-next";
import {
	ENTRY_PREFERENCES,
	injectContext,
	type QuestionType,
} from "./Root.vue";
const context = injectContext();
const { questionIndex } = defineProps<{
	questionIndex: number;
}>();

const activeQuestion = computed(() => {
	return context.data.questions[questionIndex];
});
function onDeleteBlock(index: number) {
	if (context.data.questions.length <= 1) return;
	context.data.questions.splice(index, 1);
}
function onAddBlock() {
	context.data.questions.push({
		id: new Date().getTime(),
		body: "",
		imgUrls: [] as string[],
		explanation: "",
		type: "Default" as QuestionType,
		header: "",
		explanationImgUrls: [] as string[],
		isStudyMode: false,
		choices: Array.from(
			{ length: ENTRY_PREFERENCES.value.CHOICES_ROWS },
			() => {
				return {
					id: new Date().getTime(),
					body: "",
					isCorrect: false,
					explanation: "",
				};
			}
		),
	});
}
function onToggleStudyMode(index: number) {
	context.data.questions[index].isStudyMode =
		!context.data.questions[index].isStudyMode;
}
</script>
<template>
	<div aria-role="questions-toolbar" class="flex items-center gap-2">
		<Select v-model="activeQuestion['type']">
			<SelectTrigger class="cursor-pointer !h-6">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="Default">Default</SelectItem>
				<SelectItem value="Tabular">Tabular</SelectItem>
			</SelectContent>
		</Select>
		<Button
			title="Toggle study mode"
			@click="onToggleStudyMode(questionIndex)"
			variant="link"
			:class="
				activeQuestion.isStudyMode
					? 'text-success-foreground'
					: undefined
			"
			class="cursor-pointer hover:text-success !p-0"
			:disabled="context.data.questions.length <= 1">
			<NotebookPenIcon :size="16" />
		</Button>
		<Button
			title="Add block"
			@click="onAddBlock"
			variant="link"
			class="cursor-pointer hover:text-muted-foreground !p-0">
			<PlusCircleIcon :size="16" />
		</Button>
		<Button
			title="Delete Block"
			@click="onDeleteBlock(questionIndex)"
			variant="link"
			class="cursor-pointer hover:text-destructive !p-0"
			:disabled="context.data.questions.length <= 1">
			<Trash2Icon :size="16" />
		</Button>
	</div>
</template>
