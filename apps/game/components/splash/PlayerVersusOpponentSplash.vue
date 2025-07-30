<script setup lang="ts">
// import versus_img from "@client/assets/img/versus-icon-1.webp";
const $$game = useGameStore();
</script>
<template>
	<div
		class="fixed bg-black top-0 left-0 w-dvw h-dvh z-50 flex items-center justify-center overflow-clip gap-10">
		<div class="flex flex-col items-center gap-3 mr-auto ml-[30%]">
			<img
				alt="user-logo"
				:src="$$game.players.user.info?.avatarUrl!"
				class="aspect-square rounded-full object-cover w-[10vmax]" />
			<p
				class="text-[max(16px,1.3vmax)] font-semibold font-rubik text-center capitalize">
				{{ $$game.players.user.info?.username }}
			</p>
		</div>

		<!-- <img alt="avb" class="h-[40vmax]" :src="versus_img" /> -->
		<div class="flex flex-col items-center gap-3 ml-auto mr-[30%]">
			<img
				v-if="$$game.players.opponent.info.avatarUrl"
				alt="opponent-logo"
				:src="$$game.players.opponent.info.avatarUrl!"
				class="aspect-square object-cover rounded-full w-[10vmax]" />
			<p
				class="text-[max(16px,1.3vmax)] font-semibold font-rubik text-center capitalize">
				{{ $$game.players.opponent.info.username }}
			</p>
		</div>
	</div>
</template>
