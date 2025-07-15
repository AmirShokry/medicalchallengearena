<script setup lang="ts">
import { injectContext } from "./Root.vue";
import {
	Trash2Icon,
	CircleCheckIcon,
	PlusCircleIcon,
	CircleQuestionMarkIcon,
} from "lucide-vue-next";

const { questionIndex } = defineProps<{
	questionIndex: number;
}>();

const data = injectContext();

const choices = computed(() => data.data.questions[questionIndex].choices);

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
	const randId = new Date().getTime();
	choices.value.push({
		id: randId,
		body: "",
		explanation: "",
		isCorrect: false,
	});
}

function handleAddExplanation(index: number) {
	if (choices.value[index].explanation === " ")
		return (choices.value[index].explanation = "");
	choices.value[index].explanation = " ";
}
</script>
<template>
	<div aria-role="choice-input">
		<div class="grid gap-2">
			<div class="flex gap-1">
				<Label for="choice">Choices</Label>
				<Button
					@click="handleAddChoice"
					title="Add choice"
					variant="link"
					class="!p-0 hover:text-muted-foreground cursor-pointer">
					<PlusCircleIcon />
				</Button>
			</div>
			<ul class="grid gap-2">
				<li v-for="(choice, index) in choices" class="flex">
					<div class="flex flex-col gap-1 w-full">
						<Input tabindex="1" v-model="choice.body" />
						<Input
							tabindex="1"
							v-if="choice.explanation"
							v-model="choice.explanation" />
					</div>

					<div class="flex gap-1 ml-3">
						<Button
							title="Add explanation"
							variant="link"
							tabindex="-1"
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
							tabindex="-1"
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
							tabindex="-1"
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
