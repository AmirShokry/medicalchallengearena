<!--
  StoryKeypoints
  ==============
  Tap-to-advance slideshow over a station's `keypoints` array. Mirrors
  the `setupBulletSlideshow` UX from the reference HTML:

    - Counter at the top: "01 / 04 · KEY POINTS".
    - Stage card showing the active keypoint. Click the card → next
      keypoint. Click again past the last one → no-op.
    - Pulsing hint line under the card ("Tap the card or press → for
      the next point").
    - Controls row with ← Back / dot indicators / Next →. Dots are
      themselves clickable to jump.
    - Keyboard: → / Space / Enter advances, ← / Backspace goes back.

  The component takes a plain `string[]` of keypoints (each entry may
  carry inline HTML — <strong>, <em>, <span>, etc — which is rendered
  via v-html).
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

interface Props {
	keypoints: string[];
}
const props = defineProps<Props>();

/** Active 0-based keypoint index. */
const current = ref(0);

const total = computed(() => props.keypoints.length);
const isFirst = computed(() => current.value === 0);
const isLast = computed(() => current.value >= total.value - 1);

function show(idx: number) {
	if (total.value === 0) return;
	const clamped = Math.max(0, Math.min(idx, total.value - 1));
	current.value = clamped;
}

function next() {
	if (!isLast.value) show(current.value + 1);
}
function prev() {
	if (!isFirst.value) show(current.value - 1);
}

/** Reset to first slide whenever a new array of keypoints comes in. */
watch(
	() => props.keypoints,
	() => {
		current.value = 0;
	},
);

// =====================================================================
// Keyboard navigation. Same bindings as the reference HTML
// (→/Space/Enter advance, ←/Backspace go back). Listener is attached on
// mount and removed on unmount so the component doesn't leak handlers
// when the parent toggles between modes.
// =====================================================================
function onKey(e: KeyboardEvent) {
	// Don't hijack keys while the user is typing in a form field.
	const target = e.target as HTMLElement | null;
	if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

	if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
		if (!isLast.value) {
			e.preventDefault();
			next();
		}
	} else if (e.key === "ArrowLeft" || e.key === "Backspace") {
		if (!isFirst.value) {
			e.preventDefault();
			prev();
		}
	}
}

onMounted(() => {
	window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
	window.removeEventListener("keydown", onKey);
});

// =====================================================================
// Touch swipe on the stage card — mirrors the reference HTML's
// `touchstart`/`touchend` swipe handler. >40px horizontal swipe
// advances or rewinds.
// =====================================================================
const swipeStartX = ref<number | null>(null);

function onTouchStart(e: TouchEvent) {
	if (e.touches.length === 1 && e.touches[0]) {
		swipeStartX.value = e.touches[0].clientX;
	}
}

function onTouchEnd(e: TouchEvent) {
	const startX = swipeStartX.value;
	if (startX === null) return;
	const endX = e.changedTouches[0]?.clientX ?? startX;
	const dx = endX - startX;
	if (Math.abs(dx) > 40) {
		if (dx < 0) next();
		else prev();
	}
	swipeStartX.value = null;
}
</script>

<template>
	<div v-if="total > 0" class="select-none">
		<!-- Counter -->
		<div class="mb-3 text-center font-mono text-[11px] tracking-[2px] uppercase text-muted-foreground">
			<span class="font-semibold text-[#e8a951]">
				{{ String(current + 1).padStart(2, "0") }}
			</span>
			/ {{ String(total).padStart(2, "0") }}
			&nbsp;·&nbsp; Key points
		</div>

		<!--
			Stage card — shows the current keypoint. Click anywhere on the
			card to advance. The `:key="current"` retriggers the fade
			animation on slide change.
		-->
		<div
			class="relative flex min-h-[140px] cursor-pointer items-center rounded-[10px] border border-border bg-[rgba(232,169,81,0.04)] px-6 py-7 transition-[background,border-color] duration-200 hover:border-[#e8a951] hover:bg-[rgba(232,169,81,0.08)]"
			@click="next"
			@touchstart.passive="onTouchStart"
			@touchend="onTouchEnd"
		>
			<div
				:key="current"
				class="w-full font-fraunces text-[19px] leading-[1.55] text-foreground [&_strong]:font-semibold [&_strong]:text-[#e8a951] [&_em]:italic [&_em]:text-[#e8a951] [&_.highlight]:bg-[rgba(232,169,81,0.15)] [&_.highlight]:px-1 [&_ul]:mt-2.5 [&_ul]:list-disc [&_ul]:pl-[22px] [&_ul_li]:my-1 [&_ul_li]:text-[16px] [&_ul_li]:leading-[1.5] [animation:storyKpFadeIn_320ms_ease]"
				v-html="keypoints[current]"
			/>
		</div>

		<!-- Hint -->
		<div
			class="px-0 py-3.5 text-center font-inter text-[11px] tracking-[2px] uppercase text-muted-foreground"
			:class="{
				'[animation:storyKpPulse_1.6s_ease-in-out_infinite]': !isLast,
			}"
		>
			<template v-if="isLast">All key points read</template>
			<template v-else>Tap the card or press → for the next point</template>
		</div>

		<!-- Controls -->
		<div class="mt-1.5 flex items-center justify-between gap-2.5">
			<button
				type="button"
				class="cursor-pointer rounded-md border border-border bg-transparent px-3.5 py-1.5 font-inter text-[12px] tracking-[1.5px] uppercase text-muted-foreground transition-all duration-200 hover:border-[#e8a951] hover:text-[#e8a951] disabled:cursor-not-allowed disabled:opacity-30"
				:disabled="isFirst"
				@click.stop="prev"
			>
				← Back
			</button>

			<!-- Dots — clickable jump targets. Each dot stops propagation
			     so it doesn't also trigger the card's `next` handler. -->
			<div class="flex flex-1 flex-wrap justify-center gap-1.5">
				<button
					v-for="(_, i) in keypoints"
					:key="i"
					type="button"
					class="h-[7px] w-[7px] cursor-pointer rounded-full transition-[background,transform] duration-200"
					:class="
						i === current
							? 'bg-[#e8a951] scale-[1.4]'
							: i < current
								? 'bg-[#c08537]'
								: 'bg-border'
					"
					:aria-label="`Go to key point ${i + 1}`"
					@click.stop="show(i)"
				/>
			</div>

			<button
				type="button"
				class="cursor-pointer rounded-md border border-border bg-transparent px-3.5 py-1.5 font-inter text-[12px] tracking-[1.5px] uppercase text-muted-foreground transition-all duration-200 hover:border-[#e8a951] hover:text-[#e8a951] disabled:cursor-not-allowed disabled:opacity-30"
				:disabled="isLast"
				@click.stop="next"
			>
				Next →
			</button>
		</div>
	</div>
</template>

<style scoped>
@keyframes storyKpFadeIn {
	from {
		opacity: 0;
		transform: translateY(6px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
@keyframes storyKpPulse {
	0%,
	100% {
		opacity: 0.5;
	}
	50% {
		opacity: 1;
		color: #e8a951;
	}
}
</style>
