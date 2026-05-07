<!--
  StationNode
  ===========
  A single station rendered as a horizontal row inside the vertical
  ChapterMap track:

      [dot]   LABEL (e.g. STATION 03)
              Title of the station
              Italic subtitle for the station

  Mirrors the "VERTICAL CHAPTER MAP" rules from
  `MCA adaptive immunity story.html` — the dot sits in column 1 and
  spans all three text rows, the text column flows on the right and is
  capped at ~540px so long subtitles wrap cleanly.
-->
<script setup lang="ts">
import { computed } from "vue";
import type { StationStatus } from "@/composables/storymode/types";

interface Props {
	num: number; // 1-based station number
	label: string;
	title: string;
	subtitle: string | null;
	status: StationStatus;
}
const props = defineProps<Props>();

const emit = defineEmits<{ click: [] }>();

const numLabel = computed(() => String(props.num).padStart(2, "0"));

function onClick() {
	if (props.status === "locked") return;
	emit("click");
}
</script>

<template>
	<!--
		3-row × 2-col grid:
		  col 1: the dot (spans all rows, vertically centred)
		  col 2: label / title / subtitle (one per row)
		Padding is light because the parent track owns the vertical gap
		between stations.
	-->
	<div
		class="relative z-[2] grid w-full max-w-[700px] grid-cols-[auto_1fr] grid-rows-[auto_auto_auto] items-start gap-x-[18px] py-1.5 text-left"
		:class="{ 'cursor-pointer': status !== 'locked' }"
		@click="onClick"
	>
		<!-- Dot (column 1, spans all 3 rows) -->
		<div class="relative col-start-1 row-span-3 self-center">
			<!-- Pulse ring (only when status === 'available') -->
			<div
				v-if="status === 'available'"
				class="pointer-events-none absolute -inset-[5px] rounded-full border border-[#e8a951] opacity-60 [animation:storyPulse_2.4s_ease-in-out_infinite]"
			/>
			<div
				class="relative z-[3] flex h-[42px] w-[42px] items-center justify-center rounded-full border-2 font-fraunces text-[14px] font-medium transition-all duration-300"
				:class="[
					status === 'available'
						? 'bg-card border-[#e8a951] text-[#e8a951] [box-shadow:0_0_16px_rgba(232,169,81,0.3)]'
						: status === 'completed'
							? 'bg-[#e8a951] border-[#e8a951] text-background [box-shadow:0_0_14px_rgba(232,169,81,0.4)]'
							: 'bg-background border-border border-dashed text-muted-foreground cursor-not-allowed',
					status !== 'locked' ? 'hover:scale-[1.08]' : '',
				]"
			>
				<span v-if="status !== 'completed' && status !== 'locked'">
					{{ numLabel }}
				</span>
				<span
					v-else-if="status === 'completed'"
					class="font-inter text-[16px] font-bold"
					>✓</span
				>
				<svg
					v-else
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="h-3 w-3 fill-muted-foreground"
					aria-hidden="true"
				>
					<path
						d="M17 8V7a5 5 0 0 0-10 0v1H5v13h14V8h-2zm-8-1a3 3 0 1 1 6 0v1H9V7z"
					/>
				</svg>
			</div>
		</div>

		<!-- Label (column 2, row 1) -->
		<div
			class="col-start-2 row-start-1 self-end font-mono text-[8px] tracking-[0.2em] uppercase transition-colors duration-300"
			:class="
				status === 'locked'
					? 'text-muted-foreground'
					: status === 'available'
						? 'text-foreground'
						: 'text-muted-foreground'
			"
		>
			{{ label }}
		</div>

		<!-- Title (column 2, row 2) -->
		<div
			class="col-start-2 row-start-2 font-fraunces text-[16px] font-medium leading-[1.3] transition-colors duration-300"
			:class="
				status === 'locked'
					? 'text-muted-foreground'
					: status === 'available'
						? 'text-[#e8a951]'
						: status === 'completed'
							? 'text-foreground'
							: 'text-muted-foreground'
			"
		>
			{{ title }}
		</div>

		<!-- Subtitle (column 2, row 3) -->
		<div
			v-if="subtitle"
			class="col-start-2 row-start-3 max-w-[540px] font-fraunces text-[12.5px] italic font-normal leading-[1.4] transition-colors duration-300"
			:class="
				status === 'locked'
					? 'text-muted-foreground'
					: status === 'available'
						? 'text-muted-foreground'
						: 'text-muted-foreground/80'
			"
		>
			{{ subtitle }}
		</div>
	</div>
</template>

<style scoped>
@keyframes storyPulse {
	0%, 100% {
		transform: scale(1);
		opacity: 0.6;
	}
	50% {
		transform: scale(1.15);
		opacity: 0.15;
	}
}
</style>
