<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { PanelLeft } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./utils";

const props = defineProps<{
	class?: HTMLAttributes["class"];
	side?: "left" | "right";
}>();

const { toggleSidebar } = useSidebar();
function handleClick() {
	toggleSidebar(props.side ?? "left");
}
</script>

<template>
	<Button
		data-sidebar="trigger"
		data-slot="sidebar-trigger"
		variant="ghost"
		size="icon"
		:class="cn('h-7 w-7', props.class)"
		@click="handleClick">
		<PanelLeft />
		<span class="sr-only">Toggle Sidebar</span>
	</Button>
</template>
