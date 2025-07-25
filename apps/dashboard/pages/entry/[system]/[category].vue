<script setup lang="ts">
import {
	type CaseTypes,
	ENTRY_PREFERENCES,
	CASE_TYPES,
} from "@/components/entry/Input/Index.vue";
import {
	activeContentName,
	setActiveContent,
} from "~/components/sidebars/default/utils";
import { useSidebar } from "~/components/ui/sidebar/utils";
const params = computed(() => useRoute("entry-system-category").params);

definePageMeta({
	middleware: "valid-entry-params",
});
useSeoMeta({
	title: `MCA | ${params.value.system} ${params.value.category} `,
	description: "Create and manage entries for the medical challenge arena.",
});

if (activeContentName.value !== "ContentEntry")
	setActiveContent("ContentEntry", {
		defaultActiveSystem: params.value.system,
		defaultActiveCategory: params.value.category,
	});

const { isMobile, setOpen } = useSidebar();

setOpen(ENTRY_PREFERENCES.value.IS_SIDEBAR_OPEN);
// setOpenMobile(ENTRY_PREFERENCES.value.IS_SIDEBAR_OPEN);

const activeCaseType = ref<CaseTypes>(ENTRY_PREFERENCES.value.CASE_TYPE);
const { $trpc } = useNuxtApp();

const inputStore = useInputStore();
inputStore.resetInput();
const { data: category_id } = await $trpc.common.getCategoryIdByName.useQuery({
	category: params.value.category,
});

inputStore.activeCategoryId = category_id.value;
</script>

<template>
	<div class="flex flex-col min-h-0 h-dvh">
		<header
			class="flex h-10 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<div class="flex items-center gap-2 px-4">
				<SidebarTrigger class="-ml-1" />
				<Separator
					orientation="vertical"
					class="mr-2 data-[orientation=vertical]:h-4" />
				<Breadcrumb>
					<BreadcrumbList class="!flex-nowrap">
						<BreadcrumbItem class="max-sm:hidden"
							>{{ params.system }}
						</BreadcrumbItem>
						<BreadcrumbSeparator class="max-sm:hidden" />
						<BreadcrumbItem>{{ params.category }}</BreadcrumbItem>
						<BreadcrumbItem>
							<Select v-model="activeCaseType">
								<SelectTrigger
									class="cursor-pointer mx-1 !h-6 !bg-featured text-primary">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										v-for="examType in CASE_TYPES"
										class="cursor-pointer"
										:key="examType"
										:value="examType">
										{{ examType }}
									</SelectItem>
								</SelectContent>
							</Select>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</header>
		<ResizablePanelGroup :direction="isMobile ? 'vertical' : 'horizontal'">
			<ResizablePanel
				:default-size="ENTRY_PREFERENCES.INPUT_PANEL_SIZE[0]">
				<EntryInput :case-type="activeCaseType" />
			</ResizablePanel>
			<ResizableHandle with-handle />
			<ResizablePanel>
				<EntryPreviewRoot
					:system="params.system"
					:category="params.category"
					:case-type="activeCaseType" />
			</ResizablePanel>
		</ResizablePanelGroup>
	</div>
</template>
