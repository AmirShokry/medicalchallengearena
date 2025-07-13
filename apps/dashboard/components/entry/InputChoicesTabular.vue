<script setup lang="ts">
import { DEFAULT_CHOICES_COLUMNS } from ".";
import {
	Trash2Icon,
	CircleCheckIcon,
	CircleQuestionMarkIcon,
} from "lucide-vue-next";

const props = defineProps<{
	tabindex?: number;
}>();

const choices = defineModel<
	{
		id: number;
		body: string;
		isCorrect: boolean | null;
		explanation: string | null;
	}[]
>("choices", { required: true });
function handleDeleteChoice(index: number) {
	if (choices.value.length <= 2) return;
	choices.value.splice(index, 1);
}

function handleCheckChoice(index: number) {
	choices.value[index].isCorrect = !choices.value[index].isCorrect;
	choices.value.map((choice, i) => {
		if (i !== index) return (choice.isCorrect = false);
	});
}

function handleAddChoice() {
	choices.value.push({
		id: new Date().getTime(),
		body: "",
		explanation: "",
		isCorrect: false,
	});
}

function handleAddExplanation(index: number) {
	// if (choices.value[index].explanation == " ")
	// 	return (choices.value[index].explanation = "");
	// choices.value[index].explanation = " ";
}
const rowsCount = computed(() => choices.value.length);
const columnsCount = ref(DEFAULT_CHOICES_COLUMNS.value);

const segMentedChoices = ref(
	Array.from({ length: rowsCount.value }, () => {
		return Array.from(
			{
				length: columnsCount.value ?? 0,
			},
			() => ""
		);
	})
);

const segmentedHeader = ref(
	Array.from({ length: columnsCount.value }, () => "")
);
</script>
<template>
	<div aria-role="tabular-question header" class="my-2">
		<div class="flex flex-col gap-2 mt-4 w-[calc(100%-68px)]">
			<Label>Header</Label>
			<div
				class="grid gap-2"
				:style="{
					gridTemplateColumns: `repeat(${DEFAULT_CHOICES_COLUMNS}, minmax(0, 1fr))`,
				}">
				<Input
					v-for="(_, col_index) in segmentedHeader"
					v-model="segmentedHeader[col_index]"
					:tabindex="tabindex || 0 + col_index + 1"
					class="text-muted-foreground" />
			</div>
		</div>
	</div>
	<div aria-role="choice-input">
		<div class="grid gap-2">
			<ul class="grid gap-2">
				<li v-for="(choice, index) in choices" class="flex">
					<div class="w-full">
						<div
							class="grid gap-2 w-full"
							:style="{
								gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`,
							}">
							<Input
								v-for="(col, col_index) in segMentedChoices[
									index
								]"
								v-model="segMentedChoices[index][col_index]"
								:tabindex="tabindex || 0 + index + col_index" />
						</div>
					</div>
					<div class="flex gap-1 ml-3">
						<Button
							title="Add explanation"
							variant="link"
							@click.prevent="handleAddExplanation(index)"
							class="hover:text-muted !p-0 cursor-pointer"
							:class="
								choice.explanation
									? 'text-muted-foreground'
									: undefined
							">
							<CircleQuestionMarkIcon :size="18" />
						</Button>
						<Button
							title="Mark correct"
							variant="link"
							@click="handleCheckChoice(index)"
							class="hover:text-success !p-0 cursor-pointer"
							:class="
								choice.isCorrect === true
									? 'text-success-foreground'
									: undefined
							">
							<CircleCheckIcon :size="18" />
						</Button>

						<Button
							title="Remove Choice"
							variant="link"
							@click="handleDeleteChoice(index)"
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
