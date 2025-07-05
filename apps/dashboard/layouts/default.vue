<script setup lang="ts">
import { sidebarWidth, sidebarWidthMobile } from "~/components/ui/sidebar";
</script>

<template>
	<SidebarProvider
		:style="{
			'--sidebar-width': sidebarWidth,
			'--sidebar-width-mobile': sidebarWidthMobile,
		}">
		<SidebarsDefault collapsible="offcanvas" />
		<SidebarInset>
			<slot />
		</SidebarInset>
	</SidebarProvider>
</template>
