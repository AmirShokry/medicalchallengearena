<script setup lang="ts">
defineProps<{
	currentQuestion: number;
	total: number;
}>();
</script>
<template>
	<header class="self-stretch flex flex-col">
		<div class="flex gap-4">
			<p class="font-semibold text-2xl">Question {{ currentQuestion }}</p>
			<slot name="header-prepend"></slot>
		</div>
		<slot name="below-title">
			<p class="font-medium px-2">
				{{ currentQuestion }} of
				{{ total }}
			</p>
		</slot>
	</header>
</template>
