<!--
  StationNode
  ===========
  A single station "dot + label" rendered in a chapter's horizontal map.
  Status drives the visual treatment exactly like the reference HTML's
  `.node.locked / .available / .completed` classes.
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
		Matches the reference HTML's `.node` rules:
		  - Desktop (≥760px): `flex: 1; min-width: 0` — stations share
		    the available width evenly, never overflowing, so all
		    stations are visible in one row without a scrollbar.
		  - Mobile (<760px): fixed 160px width — the parent track grows
		    to its natural width and the wrapper scrolls horizontally
		    (configured via `max-[760px]:` variants).
	-->
	<div
		class="relative z-[2] flex min-w-0 flex-1 flex-col items-center px-1 text-center max-[760px]:w-[160px] max-[760px]:min-w-[160px] max-[760px]:flex-none max-[760px]:px-2"
		:class="{ 'cursor-pointer': status !== 'locked' }"
		@click="onClick"
	>
		<!-- Pulse ring (only when status === 'available') -->
		<div class="relative mt-1 mb-2.5">
			<div
				v-if="status === 'available'"
				class="pointer-events-none absolute -inset-[5px] rounded-full border border-[#e8a951] opacity-60 [animation:storyPulse_2.4s_ease-in-out_infinite]"
			/>
			<div
				class="relative z-[3] flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 font-fraunces text-[13px] font-medium transition-all duration-300"
				:class="[
					status === 'available'
						? 'bg-[#111826] border-[#e8a951] text-[#e8a951] [box-shadow:0_0_16px_rgba(232,169,81,0.3)]'
						: status === 'completed'
							? 'bg-[#e8a951] border-[#e8a951] text-[#0a0e1a] [box-shadow:0_0_14px_rgba(232,169,81,0.4)]'
							: 'bg-[#050811] border-[#222c3e] border-dashed text-[#3a4358] cursor-not-allowed',
					status !== 'locked' ? 'hover:scale-[1.08]' : '',
				]"
			>
				<!-- The number is hidden once completed (replaced with a checkmark) and when locked (replaced with a lock icon). -->
				<span
					v-if="status !== 'completed' && status !== 'locked'"
				>
					{{ numLabel }}
				</span>
				<span v-else-if="status === 'completed'" class="font-inter text-[16px] font-bold">✓</span>
				<svg
					v-else
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="h-2.5 w-2.5 fill-[#3a4358]"
					aria-hidden="true"
				>
					<path d="M17 8V7a5 5 0 0 0-10 0v1H5v13h14V8h-2zm-8-1a3 3 0 1 1 6 0v1H9V7z" />
				</svg>
			</div>
		</div>
		<!-- Labels -->
		<div
			class="mb-0.5 font-mono text-[8px] tracking-[0.2em] uppercase transition-colors duration-300"
			:class="
				status === 'locked'
					? 'text-[#3a4358]'
					: status === 'available'
						? 'text-[#e8ecf3]'
						: 'text-[#6b7689]'
			"
		>
			{{ label }}
		</div>
		<div
			class="mb-[3px] font-fraunces text-[12px] font-medium leading-[1.25] transition-colors duration-300"
			:class="
				status === 'locked'
					? 'text-[#3a4358]'
					: status === 'available'
						? 'text-[#e8a951]'
						: status === 'completed'
							? 'text-[#e8ecf3]'
							: 'text-[#b4becf]'
			"
		>
			{{ title }}
		</div>
		<div
			v-if="subtitle"
			class="px-0.5 font-fraunces text-[10.5px] italic font-normal leading-[1.25] transition-colors duration-300"
			:class="
				status === 'locked'
					? 'text-[#3a4358]'
					: status === 'available'
						? 'text-[#b4becf]'
						: 'text-[#6b7689]'
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
