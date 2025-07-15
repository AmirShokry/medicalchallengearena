<script setup lang="ts">
// import {
// 	DEFAULT_ENTRY_PANEL_SIZE,
// 	DEFAULT_CASE_TYPE,
// 	CASE_TYPES,
// 	IS_SIDEBAR_OPEN,
// } from "~/components/entry";
import {
	ENTRY_PREFERENCES,
	CASE_TYPES,
} from "~/components/entry/Input/Root.vue";
import {
	activeContentName,
	setActiveContent,
} from "~/components/sidebars/default/utils";
import { useSidebar } from "~/components/ui/sidebar/utils";
const params = computed(() => useRoute("entry-system-category").params);
// useInputStore().resetInput();

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

const activeCaseType = ref(ENTRY_PREFERENCES.value.CASE_TYPE);
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
					<BreadcrumbList>
						<BreadcrumbItem>{{ params.system }} </BreadcrumbItem>
						<BreadcrumbSeparator />
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
				<EntryInput />
			</ResizablePanel>
			<ResizableHandle with-handle />
			<ResizablePanel> </ResizablePanel>
		</ResizablePanelGroup>
	</div>
</template>
