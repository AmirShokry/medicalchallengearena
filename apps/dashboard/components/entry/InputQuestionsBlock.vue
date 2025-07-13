<script setup lang="ts">
import { DEFAULT_CHOICES_ROWS } from ".";
import { Trash2Icon, PlusCircleIcon, NotebookPenIcon } from "lucide-vue-next";
defineProps<{
	tabindex: number;
}>();

const questions = defineModel<
	{
		id: number;
		body: string;
		imgUrls: string[];
		isStudyMode: boolean | null;
		explanation: string;
		type: "Default" | "Tabular";
		explanationImgUrls: string[];
		header: string | null;
		choices: {
			id: number;
			body: string;
			isCorrect: boolean | null;
			explanation: string | null;
		}[];
	}[]
>("questions", { required: true });

function onDeleteBlock(index: number) {
	if (questions.value.length <= 1) return;
	questions.value.splice(index, 1);
}
function onAddBlock() {
	questions.value.push({
		id: new Date().getTime(),
		body: "",
		imgUrls: [] as string[],
		explanation: "",
		type: activeQuestionType.value,
		header: null,
		explanationImgUrls: [] as string[],
		isStudyMode: false,
		choices: Array.from({ length: DEFAULT_CHOICES_ROWS.value }, () => {
			return {
				id: new Date().getTime(),
				body: "",
				isCorrect: false,
				explanation: "",
			};
		}),
	});
}
function onToggleStudyMode(index: number) {
	questions.value[index].isStudyMode = !questions.value[index].isStudyMode;
}

const activeQuestionType = ref<"Default" | "Tabular">("Default");
</script>

<template>
	<div aria-role="questions-block">
		<div
			v-for="(question, index) in questions"
			class="rounded-sm border-1 relative mt-6 p-7">
			<div
				aria-role="questions-toolbar"
				class="flex items-center gap-2 absolute right-4 top-0">
				<Select v-model="activeQuestionType">
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
					@click="onToggleStudyMode(index)"
					variant="link"
					:class="
						question.isStudyMode
							? 'text-success-foreground'
							: undefined
					"
					class="cursor-pointer hover:text-success !p-0"
					:disabled="questions.length <= 1">
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
					@click="onDeleteBlock(index)"
					variant="link"
					class="cursor-pointer hover:text-destructive !p-0"
					:disabled="questions.length <= 1">
					<Trash2Icon :size="16" />
				</Button>
			</div>

			<div aria-role="question-input">
				<ImageUploadProvider :images="question.imgUrls">
					<div class="grid gap-2">
						<Label for="question">
							<span class="underline underline-offset-1">
								#{{ index + 1 }}
							</span>
							Question
						</Label>
						<div class="flex items-center gap-1">
							<Textarea
								class="break-all"
								v-model="question.body"
								name="question"
								:tabindex="tabindex + index" />
							<ImageUploadTrigger />
						</div>
						<ImageUploadGallery />
					</div>
				</ImageUploadProvider>
			</div>

			<EntryInputChoices
				v-if="activeQuestionType === 'Default'"
				v-model:choices="question.choices"
				class="mt-6"
				:tabindex="tabindex + 1 + index" />

			<EntryInputChoicesTabular
				v-else
				:tabindex="tabindex + 1 + index"
				v-model:choices="question.choices" />
			<EntryInputExplanation
				v-model:explanation="question.explanation"
				v-model:explanation-img-urls="question.explanationImgUrls"
				class="mt-6"
				:tabindex="tabindex + 1 + index" />
		</div>
	</div>
</template>
