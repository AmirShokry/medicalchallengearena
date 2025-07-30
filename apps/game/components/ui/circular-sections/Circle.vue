<script setup lang="ts">
import Paths from "./Paths.vue";
const props = defineProps<{
	length?: number;
	imgUrl: string;
	records?: boolean[];
	oneSector?: boolean;
	status?: "correct" | "incorrect" | "pending";
	imgSize?: string;
}>();

const outerRadius = 50,
	innerRadius = 40,
	fontSize = 8;

const isCurrentQuestion = (index: number) => index === props.records?.length,
	isCorrect = (index: number) => props.records?.[index],
	isNotAnswered = (index: number) =>
		props.records && index > props.records.length;

function getSVGMatrix(index: number) {
	if (!props.length) return "";
	const startAngle = ((360 / props.length) * index - 90) * (Math.PI / 180),
		endAngle = ((360 / props.length) * (index + 1) - 90) * (Math.PI / 180);

	const x1Outer = 50 + outerRadius * Math.cos(startAngle),
		y1Outer = 50 + outerRadius * Math.sin(startAngle),
		x2Outer = 50 + outerRadius * Math.cos(endAngle),
		y2Outer = 50 + outerRadius * Math.sin(endAngle),
		x1Inner = 50 + innerRadius * Math.cos(startAngle),
		y1Inner = 50 + innerRadius * Math.sin(startAngle),
		x2Inner = 50 + innerRadius * Math.cos(endAngle),
		y2Inner = 50 + innerRadius * Math.sin(endAngle);

	return `M ${x1Outer} ${y1Outer} 
			A ${outerRadius} ${outerRadius} 0 0 1 ${x2Outer} ${y2Outer} 
			L ${x2Inner} ${y2Inner} 
			A ${innerRadius} ${innerRadius} 0 0 0 ${x1Inner} ${y1Inner} Z`;
}
function getFillColor(index: number) {
	if (!props.records) return "black";
	if (isNotAnswered(index)) return "white";
	if (isCurrentQuestion(index)) return "orange";
	return isCorrect(index) ? "red" : "green";
}

function getFullCirclePath() {
	return `
		M ${50 + outerRadius} 50
		A ${outerRadius} ${outerRadius} 0 1 1 ${50 - outerRadius} 50
		A ${outerRadius} ${outerRadius} 0 1 1 ${50 + outerRadius} 50
		L ${50 + innerRadius} 50
		A ${innerRadius} ${innerRadius} 0 1 0 ${50 - innerRadius} 50
		A ${innerRadius} ${innerRadius} 0 1 0 ${50 + innerRadius} 50 Z
	`;
}
function getOneSectorFill() {
	if (props.status === "correct") return "green";
	if (props.status === "incorrect") return "red";
	return "orange";
}
const showAnswerAnimation = ref(false);
const newStatusFillColor = computed(() => {
	if (props.status === "correct") return "green";
	if (props.status === "incorrect") return "red";
	return "transparent";
});

watch(
	() => props.status,
	(value) => {
		if (value === "correct" || value === "incorrect")
			showAnswerAnimation.value = !showAnswerAnimation.value;
	}
);
</script>

<template>
	<svg
		:width="imgSize ?? '5vmax'"
		class="overflow-visible"
		viewBox="0 0 100 100">
		<Paths
			v-if="!props.oneSector"
			v-for="(_, index) in length"
			:disabled="isNotAnswered(index)"
			:key="index"
			:d="getSVGMatrix(index)"
			:dy="(outerRadius - innerRadius) * 0.5 + 0.5 * fontSize"
			:fontSize="fontSize"
			:startOffset="`${25 - (length || 0 - fontSize / 2)}%`"
			:fill="getFillColor(index)"
			:number="index + 1"></Paths>
		<g v-else>
			<path
				class="origin-center"
				:d="getFullCirclePath()"
				:fill="getOneSectorFill()" />
			<Transition appear name="ping">
				<path
					v-if="showAnswerAnimation"
					class="origin-center"
					:d="getFullCirclePath()"
					:fill="getOneSectorFill()" />
			</Transition>
		</g>

		<g style="clip-path: circle(50% at 50% 45%)">
			<image
				style="clip-path: circle(50% at 50% 50%)"
				:href="imgUrl"
				:x="outerRadius - innerRadius"
				:y="outerRadius - innerRadius"
				:width="innerRadius * 2"
				:height="innerRadius * 2"
				preserveAspectRatio="xMidYMid slice" />

			<rect
				:x="outerRadius - innerRadius"
				:y="innerRadius * 2 - 5"
				:width="2 * innerRadius"
				:height="innerRadius / 2"
				fill="#343434"
				class="blur-[5px]" />
			<foreignObject
				:x="
					outerRadius -
					innerRadius +
					(1 / 2) * (1 / 2) * (2 * innerRadius)
				"
				:y="innerRadius * 1.7"
				:width="2 * innerRadius - (1 / 2) * (2 * innerRadius)"
				:height="innerRadius / 2">
				<div class="font-bold text-center py-1">
					<p class="text-[0.67rem] truncate leading-none">
						<slot name="name" />
					</p>
					<p class="text-[0.4rem] truncate leading-none">
						<slot name="rank" />
					</p>
				</div>
			</foreignObject>
		</g>
	</svg>
</template>
<style scoped>
.ping-enter-active,
.ping-leave-active {
	animation: pingkeyframe 1s cubic-bezier(0, 0, 0.2, 1);
}

.ping-leave-to {
	fill: v-bind(newStatusFillColor);
	animation: pingkeyframe 1s cubic-bezier(0, 0, 0.2, 1);
}

@keyframes pingkeyframe {
	75%,
	100% {
		transform: scale(2);
		opacity: 0;
	}
}
</style>
