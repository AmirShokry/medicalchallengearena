<script setup lang="ts">
import { ChevronsUpDown, Plus } from "lucide-vue-next";
import { useSidebar } from "~/components/ui/sidebar";

const props = defineProps<{
	roles: {
		name: string;
		logo: Component;
		plan: string;
	}[];
}>();

const { isMobile, setOpen } = useSidebar();
const activeRole = ref(props.roles[0]);
const router = useRouter();
function goHome(event: MouseEvent) {
	event.stopPropagation();
	router.push({
		name: "index",
	});
	setOpen(false);
}
</script>

<template>
	<SidebarMenu>
		<SidebarMenuItem>
			<DropdownMenu>
				<DropdownMenuTrigger as-child>
					<SidebarMenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
						<div
							@click="goHome"
							class="flex cursor-pointer hover:scale-110 size-8 p-1 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
							<component :is="activeRole.logo" />
						</div>
						<div
							class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">
								{{ activeRole.name }}
							</span>
							<span class="truncate text-xs">{{
								activeRole.plan
							}}</span>
						</div>
						<ChevronsUpDown class="ml-auto" />
					</SidebarMenuButton>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
					align="start"
					:side="isMobile ? 'bottom' : 'right'"
					:side-offset="4">
					<DropdownMenuLabel class="text-xs text-muted-foreground">
						Roles
					</DropdownMenuLabel>
					<DropdownMenuItem
						v-for="(role, index) in roles"
						:key="role.name"
						class="gap-2 p-2"
						@click="activeRole = role">
						<div
							class="flex size-6 items-center justify-center rounded-sm border">
							<component :is="role.logo" />
						</div>
						{{ role.name }}
						<DropdownMenuShortcut
							>⌘{{ index + 1 }}</DropdownMenuShortcut
						>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem class="gap-2 p-2">
						<div
							class="flex size-6 items-center justify-center rounded-md border bg-transparent">
							<Plus class="size-4" />
						</div>
						<div class="font-medium text-muted-foreground">
							Add role
						</div>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	</SidebarMenu>
</template>
