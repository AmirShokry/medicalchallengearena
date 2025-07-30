import type { ComputedRef, Ref } from "vue";
import { ref, computed } from "vue";
import { createContext } from "reka-ui";

export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_WIDTH = "16rem";
export const SIDEBAR_WIDTH_MOBILE = "18rem";
export const SIDEBAR_WIDTH_ICON = "3rem";
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";

// State for both left and right sidebars
const open = {
	left: ref(true),
	right: ref(false),
};
const openMobile = {
	left: ref(false),
	right: ref(false),
};

function setOpen(value: boolean, direction: "left" | "right" = "left") {
	const otherDirection = direction === "left" ? "right" : "left";

	open[direction].value = value;

	// If opening this sidebar, close the other one
	if (value) {
		open[otherDirection].value = false;
		// Also close mobile version of the other sidebar if it's open
		openMobile[otherDirection].value = false;
	}
}
function setOpenMobile(value: boolean, direction: "left" | "right" = "left") {
	const otherDirection = direction === "left" ? "right" : "left";

	openMobile[direction].value = value;

	// If opening this mobile sidebar, close the other sidebar (both desktop and mobile)
	if (value) {
		open[otherDirection].value = false;
		openMobile[otherDirection].value = false;
	}
}
function toggleSidebar(direction: "left" | "right" = "left") {
	const otherDirection = direction === "left" ? "right" : "left";

	// Check if current sidebar is open (either desktop or mobile)
	const isCurrentlyOpen =
		open[direction].value || openMobile[direction].value;

	if (isCurrentlyOpen) {
		// If currently open, just close it
		open[direction].value = false;
		openMobile[direction].value = false;
	} else {
		// If currently closed, open it and close the other one
		open[direction].value = true;
		// Close the other sidebar (both desktop and mobile)
		open[otherDirection].value = false;
		openMobile[otherDirection].value = false;
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

export const [useSidebar, provideSidebarContext] = createContext<{
	state: {
		left: ComputedRef<"expanded" | "collapsed">;
		right: ComputedRef<"expanded" | "collapsed">;
	};
	open: typeof open;
	setOpen: typeof setOpen;
	isMobile: Ref<boolean>;
	openMobile: typeof openMobile;
	setOpenMobile: typeof setOpenMobile;
	toggleSidebar: typeof toggleSidebar;
	isOpen: typeof isOpen;
	isOpenMobile: typeof isOpenMobile;
}>("Sidebar");

export const sidebarWidth = ref(SIDEBAR_WIDTH);
export const sidebarWidthMobile = ref(SIDEBAR_WIDTH_MOBILE);
