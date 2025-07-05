<script setup lang="ts">
import { sidebarWidth, sidebarWidthMobile } from "~/components/ui/sidebar";
import { ChevronDown } from "lucide-vue-next";
sidebarWidth.value = "20rem";
sidebarWidthMobile.value = "20rem";
const activeContent = defineModel("activeContent", {
	type: String,
	required: true,
});
const items = ref([
	{
		title: "Pulmonology",
		url: "#",
	},
	{
		title: "Cardiology",
		url: "#",
		// items: [
		// 	{
		// 		title: "General",
		// 		url: "#",
		// 	},
		// 	{
		// 		title: "Roles",
		// 		url: "#",
		// 	},
		// 	{
		// 		title: "Preferences",
		// 		url: "#",
		// 	},
		// ],
	},
]);
</script>
<template>
	<SidebarGroup>
		<div class="flex justify-between">
			<SidebarGroupLabel>Systems</SidebarGroupLabel>
			<ChevronDown />
		</div>
		<SidebarMenu>
			<Collapsible
				v-for="item in items"
				:key="item.title"
				as-child
				class="group/collapsible">
				<SidebarMenuItem>
					<CollapsibleTrigger as-child class="cursor-pointer">
						<SidebarMenuButton :tooltip="item.title">
							<span>{{ item.title }}</span>
							<!-- <ChevronRight
								v-if="item.items?.length"
								class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" /> -->
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<!-- <CollapsibleContent v-if="item.items?.length">
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
					</CollapsibleContent> -->
				</SidebarMenuItem>
			</Collapsible>
		</SidebarMenu>
	</SidebarGroup>
</template>
