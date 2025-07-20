<script setup lang="ts">
import { ENTRY_PREFERENCES } from "./Index.vue";
import {
	PlusCircleIcon,
	Trash2Icon,
	CircleCheckIcon,
	CircleQuestionMarkIcon,
} from "lucide-vue-next";

const { questionIndex } = defineProps<{
	questionIndex: number;
}>();
const { data } = useInputStore();
const questionHeader = computed(() => data.questions[questionIndex].header);
const choices = computed(() => data.questions[questionIndex].choices);

const rowsCount = computed(() => choices.value.length);

const extractedColumnCount = choices.value?.at(0)?.body
	? choices.value?.at(0)?.body.split("\t").length
	: 0;

const columnsCount = ref(
	extractedColumnCount || ENTRY_PREFERENCES.value.CHOICES_COLUMNS
);
const explanationVisibility = ref(
	Object.fromEntries(choices.value.map((_, index) => [index, false]))
);

const segmentedHeader = computed(() =>
	Array.from({ length: columnsCount.value }, (_, i) => {
		if (questionHeader.value)
			return questionHeader.value.split("\t")?.at(i) || "";

		return "";
	})
);

const segmentedChoice = computed(() =>
	Array.from({ length: rowsCount.value }, (_, i) => {
		const choiceRow = choices.value.at(i)?.body.split("\t") || "";

		return Array.from(
			{
				length: columnsCount.value ?? 2,
			},
			(_, j) => {
				if (choiceRow !== "") return choiceRow[j];
				return "";
			}
		);
	})
);

const columnStyle = computed(() => {
	return {
		gridTemplateColumns: `repeat(${columnsCount.value}, minmax(0, 1fr))`,
	};
});

function handleDeleteChoice(index: number) {
	if (choices.value.length <= 2) return;
	segmentedChoice.value.splice(index, 1);
	choices.value.splice(index, 1);
}

function handleCheckChoice(index: number) {
	choices.value[index].isCorrect = !choices.value[index].isCorrect;
	choices.value.map((choice, i) => {
		if (i !== index) return (choice.isCorrect = false);
	});
}

function handleAddChoice() {
	segmentedChoice.value.push(
		Array.from({ length: columnsCount.value ?? 2 }, () => "")
	);
	choices.value.push({
		id: new Date().getTime(),
		body: "",
		explanation: "",
		isCorrect: false,
	});
}
function onHeaderInput(rowData: string[]) {
	data.questions[questionIndex].header = rowData.join("\t");
}
function onChoiceInput(choiceIndex: number, rowData: string[]) {
	choices.value[choiceIndex].body = rowData.join("\t");
}
function handleAddExplanation(index: number) {
	explanationVisibility.value[index] = !explanationVisibility.value[index];
}
</script>
<template>
	<div aria-role="choice-input">
		<div aria-role="tabular-question header">
			<div class="flex flex-col gap-2 w-[calc(100%-68px)]">
				<div class="flex items-center gap-1">
					<Label>Header</Label>
					<Button
						@click="handleAddChoice"
						title="Add choice"
						variant="link"
						class="!p-0 hover:text-muted-foreground cursor-pointer">
						<PlusCircleIcon />
					</Button>
				</div>
				<div class="grid gap-2" :style="columnStyle">
					<Input
						v-for="(_, colIndex) in segmentedHeader"
						required
						:name="`header-${questionIndex}-${colIndex}`"
						form="submit-input"
						v-model="segmentedHeader[colIndex]"
						@update:model-value="onHeaderInput(segmentedHeader)"
						tabindex="1"
						class="text-muted-foreground" />
				</div>
			</div>
			<Separator class="my-4" />
		</div>
		<div class="grid gap-2">
			<ul class="grid gap-2" v-auto-animate>
				<li
					v-for="(choice, rowIndex) in choices"
					class="flex"
					:key="choice.id">
					<div class="w-full">
						<div class="grid gap-2 w-full" :style="columnStyle">
							<Input
								v-for="(_, colIndex) in segmentedChoice[
									rowIndex
								]"
								required
								:name="`choice-${questionIndex}-${rowIndex}-${colIndex}`"
								form="submit-input"
								v-model="segmentedChoice[rowIndex][colIndex]"
								@update:model-value="
									onChoiceInput(
										rowIndex,
										segmentedChoice[rowIndex]
									)
								"
								tabindex="1" />
							<Input
								:name="`choice-explanation-${questionIndex}-${rowIndex}`"
								tabindex="1"
								v-if="explanationVisibility[rowIndex]"
								v-model="choice.explanation!"
								class="col-span-full" />
						</div>
					</div>
					<div class="flex gap-1 ml-3">
						<Button
							variant="link"
							title="Mark correct"
							@click="handleCheckChoice(rowIndex)"
							tabindex="-1"
							:class="
								choice.isCorrect === true
									? 'text-success-foreground'
									: undefined
							"
							class="hover:text-success !p-0 cursor-pointer relative">
							<Input
								type="radio"
								required
								class="absolute opacity-0 pointer-events-none"
								:checked="choice.isCorrect"
								:name="`check-${questionIndex}`"
								form="submit-input">
							</Input>
							<CircleCheckIcon :size="18" />
						</Button>
						<Button
							title="Add explanation"
							variant="link"
							@click.prevent="handleAddExplanation(rowIndex)"
							class="hover:text-muted !p-0 cursor-pointer"
							:class="
								explanationVisibility[rowIndex]
									? 'text-muted-foreground'
									: undefined
							">
							<CircleQuestionMarkIcon :size="18" />
						</Button>

						<!-- <Button
							title="Mark correct"
							variant="link"
							@click="handleCheckChoice(rowIndex)"
							class="hover:text-success !p-0 cursor-pointer"
							:class="
								choice.isCorrect === true
									? 'text-success-foreground'
									: undefined
							">
							<CircleCheckIcon :size="18" />
						</Button> -->

						<Button
							title="Remove Choice"
							variant="link"
							@click="handleDeleteChoice(rowIndex)"
							:disabled="choices.length <= 2"
							class="hover:text-destructive !p-0 cursor-pointer">
							<Trash2Icon :size="18" />
						</Button>
					</div>
				</li>
			</ul>
		</div>
	</div>
</template>
