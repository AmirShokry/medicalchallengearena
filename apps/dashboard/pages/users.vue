<script setup lang="ts">
const { $trpc } = useNuxtApp();
const offset = ref(0);
const limit = ref(10);

const { data: usersData, pending } = $trpc.common.getUsers.useQuery(
	computed(() => ({
		offset: offset.value,
		limit: limit.value,
	}))
);

const users = computed(() => usersData.value?.users || []);
const totalCount = computed(() => usersData.value?.totalCount || 0);
const hasMore = computed(() => usersData.value?.hasMore || false);
const currentPage = computed(() => usersData.value?.currentPage || 1);
const totalPages = computed(() => usersData.value?.totalPages || 1);

const nextPage = () => {
	if (hasMore.value) {
		offset.value += limit.value;
	}
};

const prevPage = () => {
	if (offset.value > 0) {
		offset.value = Math.max(0, offset.value - limit.value);
	}
};

const canGoPrev = computed(() => offset.value > 0);
const canGoNext = computed(() => hasMore.value);
</script>
<template>
	<header
		class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
		<div class="flex items-center gap-2 px-4">
			<SidebarTrigger class="-ml-1" />
			<Separator
				orientation="vertical"
				class="mr-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem class="hidden md:block">
						<BreadcrumbLink> Users </BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	</header>
	<main class="flex flex-1 flex-col gap-4 p-4 px-40 pt-40">
		<div
			class="bg-muted/50 min-h-[50vh] px-10 py-10 rounded-xl md:min-h-min">
			<div v-if="pending" class="flex items-center justify-center py-8">
				<div class="text-muted-foreground">Loading users...</div>
			</div>
			<div
				v-else-if="!usersData || users.length === 0"
				class="flex items-center justify-center py-8">
				<div class="text-muted-foreground">No users found.</div>
			</div>
			<Table v-else>
				<TableHeader>
					<TableRow>
						<TableHead class="w-[100px]"> # </TableHead>
						<TableHead>User</TableHead>
						<TableHead>Email </TableHead>
						<TableHead>University</TableHead>
						<TableHead>Games count</TableHead>
						<TableHead>Questions count</TableHead>
						<TableHead>Medpoints</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<TableRow v-for="(user, index) in users" :key="user.id">
						<TableCell class="font-medium">
							{{ offset + index + 1 }}
						</TableCell>
						<TableCell>{{ user.username }}</TableCell>
						<TableCell>
							{{ user.email }}
						</TableCell>
						<TableCell>{{ user.university }}</TableCell>
						<TableCell>{{ user.gamesTotal }}</TableCell>
						<TableCell>{{ user.questionsTotal }}</TableCell>
						<TableCell>{{ user.medPoints }}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
			<div class="flex items-center items mt-14 w-full">
				<div class="text-sm text-muted-foreground">
					{{ offset + 1 }} to
					{{ Math.min(offset + limit, totalCount) }} of
					{{ totalCount }} users
				</div>
				<div
					class="flex items-center flex-1 justify-center mr-10 gap-2">
					<Button
						variant="outline"
						size="sm"
						:disabled="!canGoPrev || pending"
						@click="prevPage">
						Previous
					</Button>
					<span class="text-sm text-muted-foreground px-2">
						{{ currentPage }} of {{ totalPages }}
					</span>
					<Button
						variant="outline"
						size="sm"
						:disabled="!canGoNext || pending"
						@click="nextPage">
						Next
					</Button>
				</div>
			</div>
		</div>
	</main>
</template>
