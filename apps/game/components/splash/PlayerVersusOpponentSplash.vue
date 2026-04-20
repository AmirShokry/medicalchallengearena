<script setup lang="ts">
 
const $$game = useGameStore();
</script>
<template>
  <div
    class="fixed bg-black top-0 left-0 w-dvw h-dvh z-50 flex items-center justify-center overflow-clip gap-10"
  >
    <div class="flex flex-col items-center gap-3 mr-auto ml-[30%]">
      <img
        alt="user-logo"
        :src="getAvatarSrc($$game.players.user.info)"
        class="aspect-square rounded-full object-cover w-[10vmax]"
      />
      <p
        class="text-[max(16px,1.3vmax)] font-semibold not-dark:text-white text-primary text-center capitalize"
      >
        {{ $$game.players.user.info?.username }}
      </p>
    </div>
    <img
      alt="versus"
      src="~/assets/images/versus-icon.webp"
      class="w-[min(14vmax,9rem)] aspect-auto object-contain"
    />
    <div class="flex flex-col items-center gap-3 ml-auto mr-[30%]">
      <img
        alt="opponent-logo"
        :src="getAvatarSrc($$game.players.opponent.info)"
        class="aspect-square object-cover rounded-full w-[10vmax]"
      />
      <p
        class="text-[max(16px,1.3vmax)] font-semibold not-dark:text-white text-primary text-center capitalize"
      >
        {{ $$game.players.opponent.info.username }}
      </p>
    </div>
  </div>
</template>
