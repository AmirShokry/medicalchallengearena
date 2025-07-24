<script setup lang="ts">
import {
	BadgeCheck,
	ChevronsUpDown,
	LogOut,
	MoonIcon,
	SunIcon,
} from "lucide-vue-next";

import { useSidebar } from "@/components/ui/sidebar";
import { useColorMode } from "@vueuse/core";
defineProps<{
	user: {
		name: string;
		email: string;
		avatar: string;
	};
}>();
const colorMode = useColorMode();
const { isMobile } = useSidebar();

function toggleColorMode() {
	if (colorMode.state.value === "dark") colorMode.value = "light";
	else colorMode.value = "dark";
}
const { signOut } = useAuth();
function handleLogout() {
	signOut();
}
const { $trpc } = useNuxtApp();
const {
	data: userdata,
	pending,
	error,
} = $trpc.auth.getUser.useQuery(undefined, {
	server: false,
});
</script>

<template>
	<SidebarMenu>
		<SidebarMenuItem>
			<DropdownMenu>
				<DropdownMenuTrigger as-child>
					<SidebarMenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
						<Avatar class="h-8 w-8 rounded-lg">
							<AvatarImage
								v-if="userdata?.avatarUrl"
								:src="userdata?.avatarUrl!"
								:alt="userdata.username" />
							<AvatarFallback class="rounded-lg">
								MCA
							</AvatarFallback>
						</Avatar>
						<div
							v-if="userdata"
							class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{{
								userdata.username
							}}</span>
							<span class="truncate text-xs">{{
								userdata.email
							}}</span>
						</div>
						<ChevronsUpDown class="ml-auto size-4" />
					</SidebarMenuButton>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
					:side="isMobile ? 'bottom' : 'right'"
					align="end"
					:side-offset="4">
					<DropdownMenuLabel class="p-0 font-normal">
						<div
							class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
							<Avatar class="h-8 w-8 rounded-lg">
								<AvatarImage
									v-if="userdata?.avatarUrl"
									:src="userdata?.avatarUrl!"
									:alt="userdata.username" />
								<AvatarFallback class="rounded-lg">
									MCA
								</AvatarFallback>
							</Avatar>
							<div
								v-if="userdata?.username"
								class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">{{
									userdata.username
								}}</span>
								<span class="truncate text-xs">{{
									userdata.email
								}}</span>
							</div>
						</div>
					</DropdownMenuLabel>

					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuItem
							class="hover:bg-accent cursor-pointer">
							<BadgeCheck />
							Settings
						</DropdownMenuItem>
						<DropdownMenuItem
							@click="toggleColorMode"
							class="hover:bg-accent cursor-pointer">
							<div
								class="flex items-center gap-1"
								v-if="colorMode === 'dark'">
								<SunIcon />
								Switch to Light Mode
							</div>
							<div class="flex items-center gap-1" v-else>
								<MoonIcon />
								Switch to Dark Mode
							</div>
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						@click="handleLogout"
						class="hover:bg-destructive cursor-pointer">
						<LogOut class="text-primary" />
						Log out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	</SidebarMenu>
</template>
