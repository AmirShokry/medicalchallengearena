<script setup lang="ts">
import {
	DEFAULT_ENTRY_PANEL_SIZE,
	IS_SIDEBAR_OPEN,
	resetInputData,
} from "~/components/entry";
import {
	activeContentName,
	setActiveContent,
} from "~/components/sidebars/default/utils";
import { useSidebar } from "~/components/ui/sidebar/utils";
const params = computed(() => useRoute("entry-system-category").params);
resetInputData();
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

setOpen(IS_SIDEBAR_OPEN.value);
</script>

<template>
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
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	</header>
	<ResizablePanelGroup :direction="isMobile ? 'vertical' : 'horizontal'">
		<ResizablePanel :default-size="DEFAULT_ENTRY_PANEL_SIZE[0] || 70">
			<EntryInputRoot
				class="max-h-[calc(100dvh-2.5rem)] min-h-full overflow-y-auto overflow-x-hidden px-6 thin-scrollbar" />
		</ResizablePanel>
		<ResizableHandle with-handle />
		<ResizablePanel>
			<EntryPreviewRoot
				class="bg-primary/20 max-h-[calc(100dvh-2.5rem)] flex flex-1 flex-col gap-4 py-6 px-8 h-full overflow-y-auto overflow-x-hidden thin-scrollbar" />
		</ResizablePanel>
	</ResizablePanelGroup>
</template>
