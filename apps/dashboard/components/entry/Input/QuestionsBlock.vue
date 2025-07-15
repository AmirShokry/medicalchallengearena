<script setup lang="ts">
import { injectContext } from "./Root.vue";

const context = injectContext();
</script>

<template>
	<div aria-role="questions-block" class="p-1">
		<div
			v-for="(_, questionIndex) in context.data.questions"
			class="rounded-sm border-1 relative p-4 mb-4">
			<EntryInputQuestion class="mb-4" :question-index>
				<template #toolbar>
					<EntryInputQuestionToolbar :question-index />
				</template>
			</EntryInputQuestion>

			<EntryInputChoices :questionIndex />

			<EntryInputExplanation class="mb-4" :question-index />

			<!-- </div> -->
			<!-- 
			<EntryInputChoices
				v-if="activeQuestionType === 'Default'"
				v-model:choices="question.choices"
				class="mt-6"
				:tabindex="tabindex + 1 + index" /> -->
			<!-- 
			<EntryInputChoicesTabular
				v-else
				:tabindex="tabindex + 1 + index"
				v-model:choices="question.choices" /> -->
		</div>
	</div>
</template>
