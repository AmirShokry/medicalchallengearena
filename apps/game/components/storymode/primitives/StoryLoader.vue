<!--
  StoryLoader
  ===========
  Brand-themed loading indicator for story-mode pages. Three pulsing
  dots in the accent orange, with an optional uppercased label below.
  Matches the visual language of the rest of story mode (Fraunces /
  JetBrains Mono / orange accent on dark background).
-->
<script setup lang="ts">
interface Props {
	/** Optional label rendered under the dots, e.g. "Loading system…". */
	label?: string;
	/** Container variant — `inline` for in-flow, `fill` to absolutely fill its nearest positioned parent. */
	variant?: "inline" | "fill";
}

withDefaults(defineProps<Props>(), {
	label: "Loading",
	variant: "inline",
});
</script>

<template>
	<div
		role="status"
		aria-live="polite"
		class="flex flex-col items-center justify-center gap-4 text-center"
		:class="
			variant === 'fill'
				? 'absolute inset-0 z-10 bg-background/80 backdrop-blur-sm'
				: 'py-16'
		"
	>
		<!--
			Three-dot bouncer. Each dot has a staggered animation delay so
			they pulse like a wave. The dots use the same orange accent
			(`#e8a951`) and glow drop-shadow as the chapter-map progress
			line, keeping the loader visually consistent.
		-->
		<div class="flex items-end gap-2 [filter:drop-shadow(0_0_10px_rgba(232,169,81,0.45))]">
			<span class="story-loader-dot" />
			<span class="story-loader-dot [animation-delay:0.15s]" />
			<span class="story-loader-dot [animation-delay:0.3s]" />
		</div>
		<div
			v-if="label"
			class="font-jetbrains text-[10px] tracking-[0.4em] uppercase text-muted-foreground"
		>
			{{ label }}
		</div>
		<span class="sr-only">Loading…</span>
	</div>
</template>

<style scoped>
@keyframes story-loader-bounce {
	0%, 80%, 100% {
		transform: translateY(0) scale(1);
		opacity: 0.55;
	}
	40% {
		transform: translateY(-10px) scale(1.15);
		opacity: 1;
	}
}

.story-loader-dot {
	display: block;
	width: 10px;
	height: 10px;
	border-radius: 9999px;
	background: #e8a951;
	animation: story-loader-bounce 1.1s ease-in-out infinite;
}
</style>
