<script setup lang="ts">
const input = useInputStore().input;
// const columnCount = ref(2);
// const inputSegments = ref(
// 	Array.from({ length: 4 }, () => {
// 		return Array.from({ length: columnCount.value }, (_, i) => ({
// 			[`cols${[i]}`]: "",
// 		}));
// 	})
// );

// watch(
// 	inputSegments,
// 	(newValue) => {
// 		console.log("Input segments changed:", newValue);
// 	},
// 	{ deep: true }
// );
</script>
<template>
	<section aria-role="input-section" class="@container/input-section">
		<div class="p-5 @max-[150px]/input-section:hidden">
			<!-- <div
				class="grid"
				:style="{
					gridTemplateColumns: `repeat(${Object.keys(inputSegments[0]).length}, minmax(0, 1fr))`,
				}"
				v-for="rows in inputSegments">
				<Input
					v-for="(_, index) in rows"
					v-model="rows[index]"
					class="text-red-500" />
			</div> -->
			<div class="flex justify-end mb-1 gap-2">
				<EntryInputSettings />
				<Button variant="secondary" disabled> Submit </Button>
			</div>
			<EntryInputCase v-model:case="input" :tabindex="1" />
			<EntryInputQuestionsBlock
				v-model:questions="input.questions"
				:tabindex="2" />
		</div>
	</section>
</template>
