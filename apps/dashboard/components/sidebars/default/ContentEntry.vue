<script setup lang="ts">
import { sidebarWidth, sidebarWidthMobile } from "~/components/ui/sidebar";
import { ChevronRightIcon, LucideSyringe, SearchIcon } from "lucide-vue-next";
import {
	SvgoCardiology,
	SvgoGeneralPathology,
	SvgoGeneralPharmacology,
	SvgoSocialSciences,
} from "#components";
sidebarWidth.value = "24rem";
sidebarWidthMobile.value = "22rem";
const activeContent = defineModel("activeContent", {
	type: String,
	required: true,
});
const systemIcons = {
	SvgoCardiology,
	SvgoGeneralPathology,
	SvgoGeneralPharmacology,
	SvgoSocialSciences,
};
// Lazy fetch does not block the navigation;
const { data: systems, pending } = await useLazyFetch("/api/hello", {
	transform: (data) => {
		return data.map((system) => {
			return {
				...system,
				icon: shallowRef(
					systemIcons[
						`Svgo${system.name.replace(" ", "").split(" (")[0]}` as keyof typeof systemIcons
					] || LucideSyringe
				),
			};
		});
	},
});
</script>
<template>
	<SidebarGroup>
		<div class="flex justify-between">
			<SidebarGroupLabel>Systems</SidebarGroupLabel>
			<SvgoEllipsis class="mr-1 cursor-pointer" />
		</div>
		<div class="relative w-full max-w-sm items-center mb-3">
			<Input
				id="search"
				type="text"
				placeholder="Search..."
				class="pl-9" />
			<span
				class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
				<SearchIcon class="size-4 text-muted-foreground" />
			</span>
		</div>

		<SidebarMenu>
			<div
				v-if="pending"
				class="h-[20dvh] flex items-center justify-center">
				<SvgoLoader class="text-6xl text-primary" />
			</div>
			<Collapsible
				v-else
				v-for="system in systems"
				:key="system.id"
				as-child
				class="group/collapsible">
				<SidebarMenuItem>
					<CollapsibleTrigger as-child class="cursor-pointer">
						<SidebarMenuButton :tooltip="system.name">
							<component :is="system.icon" />
							<span>{{ system.name }}</span>
							<ChevronRightIcon
								v-if="system.categories.length"
								class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<SidebarMenuSub class="p-1 cursor-pointer">
							<SidebarMenuSubItem
								v-for="category in system.categories"
								:key="category.id">
								<SidebarMenuSubButton as-child>
									<span>{{ category.name }}</span>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>
		</SidebarMenu>
	</SidebarGroup>
</template>
