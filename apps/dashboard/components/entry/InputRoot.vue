<script setup lang="ts">
import { inputData } from ".";
</script>
<template>
	<section aria-role="input-section" class="@container/input-section">
		<div class="p-5 @max-[150px]/input-section:hidden">
			<div class="flex justify-end mb-1 gap-2">
				<EntryInputSettings />
				<Button variant="secondary" disabled> Submit </Button>
			</div>
			<EntryInputCase v-model:case="inputData" :tabindex="1" />
			<EntryInputQuestionsBlock
				v-model:questions="inputData.questions"
				:tabindex="2" />
		</div>
	</section>
</template>
