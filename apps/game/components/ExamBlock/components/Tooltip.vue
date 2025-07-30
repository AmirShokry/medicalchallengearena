<script setup lang="ts">
import RichText from "./RichText.vue";
import { HighlighterIcon, PlusIcon, MinusIcon } from "lucide-vue-next";
type RichTextInstance = typeof RichText;
defineProps<{
	targetText: InstanceType<RichTextInstance> | null;
}>();
</script>
<template>
	<div>
		<UiButton
			@click="targetText?.decreaseFontSize()"
			title="Decerease font size"
			class="cursor-pointer hover:scale-125 rounded-full p-2"
			variant="link">
			<MinusIcon :stroke-width="3" :size="13" />
		</UiButton>
		<UiButton
			@click="targetText?.increaseFontSize()"
			title="Increase font size"
			class="cursor-pointer hover:scale-125 rounded-full p-2"
			variant="link">
			<PlusIcon :stroke-width="3" :size="13" />
		</UiButton>
		<UiButton
			@click="targetText?.clearHighlight()"
			title="Remove Highlight"
			class="cursor-pointer hover:scale-125 rounded-full p-2"
			color="red"
			variant="link">
			<HighlighterIcon :stroke-width="4" :size="10" />
		</UiButton>
	</div>
</template>
