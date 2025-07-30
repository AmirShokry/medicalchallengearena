<script setup lang="ts">
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
</script>

<template>
	<SidebarMenu>
		<SidebarMenuItem>
			<SidebarMenuButton
				class="w-full cursor-pointer"
				@click="$router.push({ name: 'game-lobby' })">
				<div
					class="flex aspect-square size-5 items-center justify-center rounded-md">
					<SvgoLogoWhite class="text-xl"></SvgoLogoWhite>
				</div>
				<SvgoLogoWhiteText class="text-3xl mt-1" />
			</SidebarMenuButton>
		</SidebarMenuItem>
	</SidebarMenu>
</template>
