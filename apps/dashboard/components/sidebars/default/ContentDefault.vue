<script setup lang="ts">
import { ChevronRight, Settings2, SquareTerminal } from "lucide-vue-next";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
const activeContent = defineModel("activeContent", {
	type: String,
	required: true,
});
const items = ref([
	{
		title: "Entry",
		url: "#",
		icon: SquareTerminal,
		action: () => (activeContent.value = "ContentEntry"),
	},
	{
		title: "Settings",
		url: "#",
		icon: Settings2,
		items: [
			{
				title: "General",
				url: "#",
			},
			{
				title: "Roles",
				url: "#",
			},
			{
				title: "Preferences",
				url: "#",
			},
		],
	},
]);
</script>

<template>
	<SidebarGroup>
		<SidebarGroupLabel>Data</SidebarGroupLabel>
		<SidebarMenu>
			<Collapsible
				v-for="item in items"
				:key="item.title"
				as-child
				class="group/collapsible">
				<SidebarMenuItem>
					<CollapsibleTrigger
						as-child
						class="cursor-pointer"
						@click="item.action?.()">
						<SidebarMenuButton :tooltip="item.title">
							<component :is="item.icon" v-if="item.icon" />
							<span>{{ item.title }}</span>
							<ChevronRight
								v-if="item.items?.length"
								class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent v-if="item.items?.length">
						<SidebarMenuSub>
							<SidebarMenuSubItem
								v-for="subItem in item.items"
								:key="subItem.title">
								<SidebarMenuSubButton as-child>
									<a :href="subItem.url">
										<span>{{ subItem.title }}</span>
									</a>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>
		</SidebarMenu>
	</SidebarGroup>
</template>
