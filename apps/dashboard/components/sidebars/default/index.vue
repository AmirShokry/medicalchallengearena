<script setup lang="ts">
import type { SidebarProps } from "@/components/ui/sidebar";

import { AudioWaveform, GalleryVerticalEnd } from "lucide-vue-next";
import ContentDefault from "./ContentDefault.vue";
import NavUser from "~/components/sidebars/default/NavUser.vue";
import RoleSwitcher from "~/components/sidebars/default/RoleSwitcher.vue";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";

const props = withDefaults(defineProps<SidebarProps>(), {
	collapsible: "icon",
});

const data = {
	user: {
		name: "amir",
		email: "amir@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	roles: [
		{
			name: "MCA",
			logo: GalleryVerticalEnd,
			plan: "Super Admin",
		},
		{
			name: "Data Entry",
			logo: AudioWaveform,
			plan: "Standard",
		},
	],
};

const contentComponents = {
	ContentDefault,
	ContentEntry: defineAsyncComponent(() => import("./ContentEntry.vue")),
};
const activeContent = ref<keyof typeof contentComponents>("ContentDefault");
</script>

<template>
	<Sidebar v-bind="props">
		<SidebarHeader>
			<RoleSwitcher :roles="data.roles" />
		</SidebarHeader>
		<SidebarContent>
			<component
				:is="contentComponents[activeContent]"
				v-model:active-content="activeContent" />
		</SidebarContent>
		<SidebarFooter>
			<NavUser :user="data.user" />
		</SidebarFooter>
		<SidebarRail />
	</Sidebar>
</template>
