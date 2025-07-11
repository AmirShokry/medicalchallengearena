<script lang="ts">
export interface Root {
	id: number;
	body: string;
}
</script>

<script setup lang="ts">

const data = reactive({
	case: {
		id: -1,
		body: "",
		imgUrls: [] as string[],
		questions: [
			{
				id: 0,
				body: "",
				imgUrls: [] as string[],
				explanation: "",
				explanationImgUrls: [] as string[],
				isStudyMode: false,
				choices: [
					{
						id: 0,
						body: "",
						isCorrect: false,
					},
					{
						id: 1,
						body: "",
						isCorrect: false,
					},
				],
			},
			{
				id: 1,
				body: "",
				imgUrls: [] as string[],
				explanation: "",
				explanationImgUrls: [] as string[],
				isStudyMode: false,
				choices: [
					{
						id: -1,
						body: "",
						isCorrect: false,
					},
				],
			},
		],
	},
});


</script>
<template>
	<section aria-role="input-section">
		<div class="p-5">
			<EntryInputCase :tabindex="1" />
			<EntryInputQuestionsBlock v-model:questions='data.case.questions' :tabindex='2' />
			<!-- <EntryInputQuestion v-model:question="data.case.questions[index]" :index="index"
					:tabindex="2 + index" />
				<EntryInputChoices v-model:choices="question.choices" class="mt-6" :tabindex="3 + index" />
				<EntryInputExplanation v-model:explanation="question.explanation" class='mt-6' :tabindex="3 + index" /> -->
		</div>
	</section>
</template>
