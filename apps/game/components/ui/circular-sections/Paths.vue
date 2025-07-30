<script setup lang="ts">
defineProps<{
	d: string;
	fill: string;
	dy: number;
	startOffset: string;
	number: number;
	fontSize: number;
	disabled?: boolean;
}>();
</script>

<template>
	<g
		:class="disabled ? 'cursor-not-allowed' : 'record-strokes'"
		class="origin-center group">
		<path :id="`path${number}`" :d="d" :fill="fill" />
		<text
			class="font-bold invisible group-hover:visible"
			:font-size="fontSize"
			:dy="dy">
			<textPath
				:href="`#path${number}`"
				text-anchor="middle"
				:startOffset="startOffset">
				{{ number }}
			</textPath>
		</text>
	</g>
</template>

<style scoped>
.record-strokes {
	cursor: pointer;
}
.record-strokes:hover {
	transform: scale(1.15);
	transition-duration: 900ms;
	transition-delay: 900ms;
}
.record-strokes:active {
	transform: scale(1.25);
	transition: transform 600ms;
}
</style>
