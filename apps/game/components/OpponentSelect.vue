<script setup lang="ts">
import { gameSocket } from "@/components/socket";

const $$game = useGameStore();
const audio = useAudioStore();

function handleFindMatch() {
  if ($$game.flags.matchmaking.isMatchFound) return;

  audio.find_match.play();
  $$game["~resetEverything"]();
  $$game.flags.matchmaking.isFindingMatch = true;
  gameSocket.emit("challenge", { mode: "UNRANKED" });
}

function handleInviteFriend() {
  audio.navigation.play();
  $$game.flags.matchmaking.isInviting = true;
}

const canFindMatch = computed(
  () =>
    !(
      $$game.flags.matchmaking.isInviting || $$game.players.user.flags.isInvited
    )
);
const canInviteFriend = computed(
  () =>
    !(
      $$game.flags.matchmaking.isFindingMatch ||
      $$game.flags.matchmaking.isMatchFound ||
      $$game.flags.matchmaking.isInvitationSent ||
      $$game.players.user.flags.isInvited
    )
);
</script>
<template>
  <div class="w-full flex justify-center items-center gap-4 flex-wrap flex-col">
    <div v-disabled-click="!!$$game.fatalErrorMessage">
      <div
        class="w-full flex flex-col gap-6 flex-wrap justify-center items-center"
      >
        <div class="relative w-full h-[122px] flex justify-between">
          <div class="flex flex-col gap-2 items-center justify-center">
            <img
              :src="$$game.players.user.info.avatarUrl!"
              alt="user-logo"
              class="aspect-square rounded-full w-[90px] object-cover"
            />
            <p class="text-[1rem] font-medium capitalize">
              {{ $$game.players.user.info.username }}
            </p>
          </div>
          <UiButton
            title="Invite Friend"
            class="h-fit !p-0 cursor-pointer hover:scale-125"
            variant="link"
          >
            <SvgoPlayVsFriendCircle
              v-disabled-click="!canInviteFriend"
              @click="handleInviteFriend"
              :filled="true"
              class="text-8xl mb-6"
            />
          </UiButton>
        </div>
        <UiButton
          v-if="!$$game.flags.matchmaking.isFindingMatch"
          :disabled="!canFindMatch"
          @click="handleFindMatch"
          class="w-[max(210px,18vmax)] h-[max(35px, 3vmax)] fade-in"
        >
          Find Match
        </UiButton>
        <UiButton
          class="w-[max(210px,18vmax)] h-[max(35px, 3vmax)]"
          v-else
          disabled
          icon
        >
          In-queue
        </UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.show-avatar-animation {
  animation: showavatar 1s ease-in-out forwards;
}
@keyframes showavatar {
  0% {
    position: absolute;
    opacity: 0;
    transform: translateX(50%);
  }
  100% {
    opacity: 1;
    position: relative;
    transform: translateX(0);
  }
}

.show-add-friend-animation {
  left: 50%;
  position: absolute;
  animation: showaddfriend 1s ease-in-out forwards;
}

@keyframes showaddfriend {
  0% {
    opacity: 0;
    transform: translateX(0%);
  }
  100% {
    opacity: 1;
    transform: translateX(100%);
  }
}
.fade-in {
  animation: fadeIn 1s ease-in-out forwards;
}
@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
