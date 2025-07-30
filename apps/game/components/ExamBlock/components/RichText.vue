<script setup lang="ts">
import Highlight from "web-highlighter";
const props = withDefaults(
	defineProps<{
		highlight?: boolean;
		variableFontSize?: boolean;
		fontUnit?: string;
		baseFontSize?: number;
		minFontSize?: number;
		maxFontSize?: number;
		fontSizeStep?: number;
		tag?: string;
	}>(),
	{
		highlight: false,
		variableFontSize: false,
		baseFontSize: 1.125,
		minFontSize: 1,
		maxFontSize: 1.75,
		fontSizeStep: 0.125,
		fontUnit: "rem",
		tag: "pre",
	}
);

const elemRef = ref<HTMLElement>();
const highlight = new Highlight();
const fontSize = ref(props.variableFontSize ? props.baseFontSize : undefined);

onMounted(() => {
	if (props.highlight) {
		highlight.setOption({
			$root: elemRef.value,
			verbose: false,
			style: {
				className: "highlighted-text",
			},
		});
		highlight.run();
	}
});

function clearHighlight() {
	highlight.removeAll();
}
function destroyHighlight() {
	highlight.getDoms().forEach((el) => {
		el.remove();
	});
}
function increaseFontSize() {
	if (fontSize.value && props.fontSizeStep && props.maxFontSize)
		fontSize.value = Math.min(
			fontSize.value + props.fontSizeStep,
			props.maxFontSize
		);
}
function decreaseFontSize() {
	if (fontSize.value && props.fontSizeStep && props.minFontSize)
		fontSize.value = Math.max(
			fontSize.value - props.fontSizeStep,
			props.minFontSize
		);
}

defineExpose({
	clearHighlight,
	increaseFontSize,
	decreaseFontSize,
	destroyHighlight,
});
</script>
<template>
	<component
		ref="elemRef"
		:is="tag ?? 'pre'"
		:style="
			variableFontSize
				? { fontSize: `${fontSize}${fontUnit}` }
				: undefined
		">
		<slot />
	</component>
</template>
