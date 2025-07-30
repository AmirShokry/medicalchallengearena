<script setup lang="ts">
import { useEventListener, useMediaQuery } from "@vueuse/core";
import { TooltipProvider } from "reka-ui";
import { computed, type HTMLAttributes, ref } from "vue";
import { cn } from "@/lib/utils";
import {
	provideSidebarContext,
	SIDEBAR_COOKIE_MAX_AGE,
	SIDEBAR_COOKIE_NAME,
	SIDEBAR_KEYBOARD_SHORTCUT,
	SIDEBAR_WIDTH,
	SIDEBAR_WIDTH_ICON,
} from "./utils";

const props = withDefaults(
	defineProps<{
		defaultOpenLeft?: boolean;
		defaultOpenRight?: boolean;
		openLeft?: boolean;
		openRight?: boolean;
		class?: HTMLAttributes["class"];
	}>(),
	{
		defaultOpenLeft: true,
		defaultOpenRight: false,
		openLeft: undefined,
		openRight: undefined,
	}
);

const emits = defineEmits<{
	"update:openLeft": [open: boolean];
	"update:openRight": [open: boolean];
}>();

const isMobile = useMediaQuery("(max-width: 768px)");
const open = {
	left: ref(props.openLeft ?? props.defaultOpenLeft),
	right: ref(props.openRight ?? props.defaultOpenRight),
};
const openMobile = {
	left: ref(false),
	right: ref(false),
};

function setOpen(value: boolean, direction: "left" | "right" = "left") {
	const otherDirection = direction === "left" ? "right" : "left";

	open[direction].value = value;
	emits(
		`update:open${direction.charAt(0).toUpperCase() + direction.slice(1)}` as any,
		value
	);
	document.cookie = `${SIDEBAR_COOKIE_NAME}_${direction}=${open[direction].value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;

	// If opening this sidebar, close the other one
	if (value) {
		open[otherDirection].value = false;
		openMobile[otherDirection].value = false;
		emits(
			`update:open${otherDirection.charAt(0).toUpperCase() + otherDirection.slice(1)}` as any,
			false
		);
		document.cookie = `${SIDEBAR_COOKIE_NAME}_${otherDirection}=${open[otherDirection].value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
	}
}
function setOpenMobile(value: boolean, direction: "left" | "right" = "left") {
	const otherDirection = direction === "left" ? "right" : "left";

	openMobile[direction].value = value;

	// If opening this mobile sidebar, close the other sidebar (both desktop and mobile)
	if (value) {
		open[otherDirection].value = false;
		openMobile[otherDirection].value = false;
		emits(
			`update:open${otherDirection.charAt(0).toUpperCase() + otherDirection.slice(1)}` as any,
			false
		);
		document.cookie = `${SIDEBAR_COOKIE_NAME}_${otherDirection}=${open[otherDirection].value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
	}
}
function toggleSidebar(direction: "left" | "right" = "left") {
	if (isMobile.value) {
		// On mobile, use mobile state and always ensure desktop sidebars are closed
		const isCurrentlyOpen = openMobile[direction].value;

		if (isCurrentlyOpen) {
			setOpenMobile(false, direction);
		} else {
			// When opening mobile sidebar, ensure desktop states are cleared
			open.left.value = false;
			open.right.value = false;
			setOpenMobile(true, direction);
		}
	} else {
		// On desktop, use desktop state and always ensure mobile sidebars are closed
		const isCurrentlyOpen = open[direction].value;

		if (isCurrentlyOpen) {
			setOpen(false, direction);
		} else {
			// When opening desktop sidebar, ensure mobile states are cleared
			openMobile.left.value = false;
			openMobile.right.value = false;
			setOpen(true, direction);
		}
	}
}
function isOpen(direction: "left" | "right" = "left") {
	return open[direction].value;
}
function isOpenMobile(direction: "left" | "right" = "left") {
	return openMobile[direction].value;
}

const state = {
	left: computed(() => (open.left.value ? "expanded" : "collapsed")),
	right: computed(() => (open.right.value ? "expanded" : "collapsed")),
};

useEventListener("keydown", (event: KeyboardEvent) => {
	if (
		event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
		(event.metaKey || event.ctrlKey)
	) {
		event.preventDefault();
		toggleSidebar("left"); // or allow direction to be dynamic if needed
	}
});

provideSidebarContext({
	state,
	open,
	setOpen,
	isMobile,
	openMobile,
	setOpenMobile,
	toggleSidebar,
	isOpen,
	isOpenMobile,
});
</script>

<template>
	<TooltipProvider :delay-duration="0">
		<div
			data-slot="sidebar-wrapper"
			:style="{
				'--sidebar-width': SIDEBAR_WIDTH,
				'--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
			}"
			:class="
				cn(
					'group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full',
					props.class
				)
			"
			v-bind="$attrs">
			<slot />
		</div>
	</TooltipProvider>
</template>
