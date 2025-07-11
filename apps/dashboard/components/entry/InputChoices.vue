<script setup lang="ts">
import { Trash2Icon, CircleCheckIcon, PlusCircleIcon } from 'lucide-vue-next';

defineProps<{
	tabindex?: number;
}>();

const choices = defineModel<{
				id: number,
				body: string,
				isCorrect: boolean
	}[]
>("choices", {required: true});
function handleDeleteChoice(index: number) {
	if(choices.value.length <= 2) return;
	choices.value.splice(index, 1);
}

function handleCheckChoice(index: number) {
	choices.value[index].isCorrect = !choices.value[index].isCorrect;
	choices.value.map((choice, i) => {
		if (i !== index) {
			choice.isCorrect = false; 
		}
	});
}

function handleAddChoice() {
	choices.value.push({
		id: -1,
		body: "",
		isCorrect: false,
	});
}
</script>
<template>
	<div aria-role='choice-input'>

		<div class='grid gap-2'>
			<div class='flex gap-1'>
				<Label for='choice'>Choices</Label>
				<Button @click='handleAddChoice' title='Add choice' variant='link' tabindex='-1'
					class='!p-0 hover:text-muted-foreground cursor-pointer'>
					<PlusCircleIcon />
				</Button>
			</div>
			<ul class='grid gap-2'>
				<li v-for='(choice, index) in choices' :key='choice.id' class='flex items-center gap-1'>
					<Input name='choice' :tabindex="tabindex" />
					<Button title='Mark correct' variant='link' @click='handleCheckChoice(index)'
						class="hover:text-success  !p-0 cursor-pointer"
						:class="choice.isCorrect === true?'text-success-foreground': undefined">
						<CircleCheckIcon :size='18' />
					</Button>

					<Button title='Remove Choice' variant='link' @click='handleDeleteChoice(index)'
						:disabled='choices.length <= 2' class='hover:text-destructive !p-0 cursor-pointer'>
						<Trash2Icon :size='18' />
					</Button>
				</li>

			</ul>
		</div>
	</div>
</template>