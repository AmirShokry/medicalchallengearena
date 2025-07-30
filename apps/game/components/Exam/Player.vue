<script setup lang="ts">
import PlayerAvatar from "@/components/ui/circular-sections/index.vue";
import { TimerIcon } from "lucide-vue-next";
defineProps<{
	medPoints: number;
	username: string;
	avatarUrl: string;
	time?: string;
	rank: number;
	status: "correct" | "incorrect" | "pending";
	imgSize?: "string";
}>();
</script>

<template>
	<div class="flex flex-col w-fit items-center">
		<div class="flex items-center justify-center font-medium gap-2 h-fit">
			<TimerIcon />
			<p class="time-left max-md:text-[1.25rem]">
				{{ time }}
			</p>
		</div>
		<PlayerAvatar
			:img-size="imgSize"
			one-sector
			:img-url="avatarUrl"
			:status="status">
			<template #name>
				{{ username }}
			</template>
			<template #rank> #2 </template>
		</PlayerAvatar>
		<p class="text-(--accent-color) text-nowrap">
			{{ medPoints }}
			<span class="font-black">MP</span>
		</p>
	</div>
</template>
