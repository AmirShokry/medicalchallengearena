<script setup lang="ts">
import { sidebarWidth, sidebarWidthMobile } from "~/components/ui/sidebar";
import { ChevronRightIcon, LucideSyringe, SearchIcon } from "lucide-vue-next";
import {
	SvgoCardiology,
	SvgoGeneralPathology,
	SvgoGeneralPharmacology,
	SvgoSocialSciences,
} from "#components";

import Fuse from "fuse.js";


const props = defineProps<{
	defaultActiveSystem?: string;
	defaultActiveCategory?: string;
}>();


const systemIcons = {
	SvgoCardiology,
	SvgoGeneralPathology,
	SvgoGeneralPharmacology,
	SvgoSocialSciences,
};

const activeSystem = ref(props.defaultActiveSystem || "");
const activeCategory = ref(props.defaultActiveCategory || "");

sidebarWidth.value = "24rem";
sidebarWidthMobile.value = "22rem";


const { $trpc } = useNuxtApp();
const {data: systems, pending} =  $trpc.systems.categories.useQuery(undefined, {
	transform: (response) => response.map((system) => {
			return {
				...system,
				icon: shallowRef(systemIcons[(`Svgo${system.name.replace(" ", "").split(" (")[0]}`) as keyof typeof systemIcons] ),
			};
		}),
});

const fuse = computed(() => {
	if (!systems.value) return null;
	return new Fuse(systems.value, {
		keys: ["name", "categories.name"],
		threshold: 0.3,
	});
});


const isSearching = ref(false);
const searchQuery = ref("");
function handleSearchStart(){
	if(!searchQuery.value.trim()) {
		isSearching.value = false;
		return;
	}
	isSearching.value = true;

}

const systemTarget = computed(()=> isSearching.value? fuse.value && fuse.value.search(searchQuery.value).map(result => result.item) : systems.value!);

</script>
<template>
	<SidebarGroup>
		<div class="flex justify-between">
			<SidebarGroupLabel>Systems</SidebarGroupLabel>
			<SvgoEllipsis class="mr-1 cursor-pointer" />
		</div>
		<div class="relative w-full max-w-sm items-center mb-3">
			<Input id="search" type="text" placeholder="Search..." class="pl-9" v-model='searchQuery'
				@update:model-value='handleSearchStart' />
			<span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
				<SearchIcon class="size-4 text-muted-foreground" />
			</span>
		</div>

		<SidebarMenu>
			<div v-if="pending" class="h-[20dvh] flex items-center justify-center">
				<SvgoLoader class="text-6xl text-primary" />
			</div>
			<Collapsible :default-open='activeSystem === system.name' v-else v-for="system in systemTarget"
				:key="system.id" as-child class="group/collapsible">
				<SidebarMenuItem>
					<CollapsibleTrigger as-child class="cursor-pointer">
						<SidebarMenuButton :tooltip="system.name">
							<component :is="system?.icon || LucideSyringe" />
							<span>{{ system.name }}</span>
							<ChevronRightIcon v-if="system.categories.length"
								class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<SidebarMenuSub class="p-1 cursor-pointer">
							<SidebarMenuSubItem v-for="category in system.categories" :key="category.id">
								<SidebarMenuSubButton @click='() => {
										activeSystem = system.name;
										activeCategory = category.name;
									}' :class='activeSystem===system.name && activeCategory === category.name ?`bg-sidebar-accent`: undefined'
									as-child>
									<router-link :to='`/entry/${system.name}/${category.name}`'>{{ category.name
										}}</router-link>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>
		</SidebarMenu>
	</SidebarGroup>
</template>
