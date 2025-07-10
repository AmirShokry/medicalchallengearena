<script setup lang="ts">
import { activeContentName, setActiveContent } from '~/components/sidebars/default/utils';
const params = computed(() => useRoute("entry-system-category").params);
const { $trpc } = useNuxtApp();

if(activeContentName.value !== "ContentEntry")
setActiveContent('ContentEntry', {defaultActiveSystem: params.value.system, defaultActiveCategory: params.value.category, });

</script>

<template>

	<header
		class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
		<div class="flex items-center gap-2 px-4">
			<SidebarTrigger class="-ml-1" />
			<Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>{{ params.system }} </BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>{{ params.category }}</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	</header>
	<main class="flex flex-1 flex-col gap-4 p-4 pt-0 ">

	</main>

</template>
