<script setup lang="ts">
const { data } = useInputStore();
</script>

<template>
	<div aria-role="questions-block" v-auto-animate>
		<div
			v-for="(question, questionIndex) in data.questions"
			:key="question.id"
			class="rounded-sm border-1 relative p-4 mb-4">
			<EntryInputQuestion class="mb-4" :question-index>
				<template #toolbar>
					<EntryInputQuestionToolbar :question-index />
				</template>
			</EntryInputQuestion>
			<EntryInputChoices
				v-if="question.type === 'Default'"
				class="mb-4"
				:question-index="questionIndex" />
			<EntryInputChoicesTabular v-else class="mb-4" :questionIndex />

			<EntryInputExplanation class="mb-4" :question-index />
		</div>
	</div>
</template>
