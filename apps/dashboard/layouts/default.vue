<script setup lang="ts">
import { sidebarWidth, sidebarWidthMobile } from "~/components/ui/sidebar";
import SidebarsDefault from "~/components/sidebars/default/index.vue";
</script>

<template>
	<SidebarProvider
		:default-open="false"
		:style="{
			'--sidebar-width': sidebarWidth,
			'--sidebar-width-mobile': sidebarWidthMobile,
		}">
		<SidebarsDefault collapsible="offcanvas" variant="overlay" />
		<SidebarInset>
			<slot />
		</SidebarInset>
	</SidebarProvider>
</template>
