<script setup lang="ts">
const route = useRoute("entry-system-category");
const routeParams = computed(() => route.params);
console.log(routeParams.value);

const { $trpc } = useNuxtApp()

const { data } = await $trpc.systems.categories.useQuery();
</script>

<template>

	<header
		class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
		<div class="flex items-center gap-2 px-4">
			<SidebarTrigger class="-ml-1" />
			<Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>{{ routeParams.system }} </BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>{{ routeParams.category }}</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	</header>
	<main class="flex flex-1 flex-col gap-4 p-4 pt-0 text-red-500">
		<pre>
{{ JSON.stringify(data, null, 2) }}
		</pre>

	</main>

</template>
