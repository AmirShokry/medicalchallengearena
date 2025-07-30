<script setup lang="ts">
import Single from "./Single.vue";
import Multi from "./Multi.vue";
const props = defineProps<{
	mode: "Single" | "Multi";
	user: ReturnType<typeof useGameStore>["players"]["user"];
	opponent?: ReturnType<typeof useGameStore>["players"]["opponent"];
	totalQuestionsNumber: number;
}>();
const currentMode = ref(props.mode);
const modes = {
	Single,
	Multi,
};
</script>
<template>
	<component :is="modes[currentMode]" v-bind="props" />
</template>
