<script setup lang="ts">
import {
	Trash2Icon,
	CircleCheckIcon,
	PlusCircleIcon,
	CircleQuestionMarkIcon,
} from "lucide-vue-next";

const { questionIndex } = defineProps<{
	questionIndex: number;
}>();

const { data } = useInputStore();

const choices = computed(() => data.questions[questionIndex].choices);

const explanationVisibility = ref(
	Object.fromEntries(choices.value.map((_, index) => [index, false]))
);

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
	explanationVisibility.value[index] = !explanationVisibility.value[index];
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
						<Input
							required
							form="submit-input"
							:name="`choice-${index}`"
							tabindex="1"
							v-model="choice.body" />
						<Input
							tabindex="1"
							v-if="explanationVisibility[index]"
							v-model="choice.explanation!" />
					</div>

					<div class="flex gap-1 ml-3">
						<Button
							variant="link"
							title="Mark correct"
							@click="handleCheckChoice(index)"
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
							tabindex="-1"
							@click.prevent="handleAddExplanation(index)"
							class="hover:text-muted !p-0 cursor-pointer"
							:class="
								explanationVisibility[index]
									? 'text-muted-foreground'
									: undefined
							">
							<CircleQuestionMarkIcon :size="18" />
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
