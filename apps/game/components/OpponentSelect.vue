<script setup lang="ts">
import { UiDialogTitle } from "#components";
import { gameSocket } from "@/components/socket";
import { SearchIcon } from "lucide-vue-next";

const $$game = useGameStore();
const audio = useAudioStore();
const friendsStore = useFriendsStore();
const friendList = computed(() => friendsStore.friendList);
const selectedFriendId = ref<number>();

function handleFindMatch() {
  if ($$game.flags.matchmaking.isMatchFound) return;

  audio.find_match.play();
  $$game["~resetEverything"]();
  $$game.flags.matchmaking.isFindingMatch = true;
  gameSocket.emit("challenge", { mode: "UNRANKED" });
}

function handleOpenInviteFriendDialog() {
  audio.navigation.play();
  $$game.flags.matchmaking.isInviting = true;
  gameSocket.emit("userLeft");
  gameSocket.emit("userJoinedWaitingRoom");
}

function handleFriendSelected(friendId: number) {
  if (selectedFriendId.value === friendId)
    return (selectedFriendId.value = undefined);
  selectedFriendId.value = friendId;
}

function handleInvitaionSent() {
  audio.find_match.play();
  if (!selectedFriendId.value) return;
  const friend = friendList.value?.find(
    (friend) => friend.id === selectedFriendId.value
  );
  if (!friend) return;
  if (friend.status !== "online") return;
  $$game.data.invitedId = selectedFriendId.value;
  gameSocket.emit("userSentInvitation", { id: $$game.data.invitedId });
  $$game.flags.matchmaking.isInvitationSent = true;
  $$game.players.opponent.info["~set"]({
    id: friend.id,
    username: friend.username,
    medPoints: friend.medPoints,
    avatarUrl: friend.avatarUrl,
    university: friend.university,
  });
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

const canSendInvitation = computed(
  () =>
    selectedFriendId.value !== undefined &&
    !$$game.flags.matchmaking.isInvitationSent
);

function handleAccept() {
  const isInvitation = true;
  gameSocket.emit("userAccepted", isInvitation);
  $$game.players.user.flags.hasAccepted = true;
  $$game.players.user.flags.isInvited = false;
}

function handleLeaveOrDecline() {
  gameSocket.emit("userDeclined");
  $$game["~resetEverything"]();
}
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

          <UiDialog modal v-on:update:open="handleLeaveOrDecline">
            <UiDialogTrigger
              @click="handleOpenInviteFriendDialog"
              v-disabled-click="!canInviteFriend"
            >
              <UiButton
                :disabled="!canInviteFriend"
                title="Invite Friend"
                class="h-fit !p-0 cursor-pointer hover:scale-125 mb-4"
                variant="link"
              >
                <SvgoPlayVsFriendCircle :filled="true" class="text-8xl mb-6" />
              </UiButton>
            </UiDialogTrigger>

            <UiDialogContent>
              <UiDialogTitle class="text-lg"> Invite Friends </UiDialogTitle>
              <UiDialogDescription class="hidden" />
              <UiSeparator />
              <div class="relative">
                <UiInput
                  id="search"
                  type="text"
                  class="pr-10 h-8 !text-xs"
                  placeholder="Search for friends..."
                />
                <span
                  class="absolute end-0 inset-y-0 flex items-center justify-center px-2"
                >
                  <SearchIcon class="size-4 text-muted-foreground" />
                </span>
              </div>
              <ul v-for="friend in friendList" class="flex flex-col gap-3">
                <li
                  @click="handleFriendSelected(friend.id)"
                  :class="{
                    'disabled-invitation': friend.status !== 'online',
                    'selected-invitation': friend.id === selectedFriendId,
                  }"
                  class="p-3 cursor-pointer flex items-center gap-2 hover:bg-accent rounded-sm"
                >
                  <UiAvatar>
                    <UiAvatarImage :src="friend.avatarUrl" />
                  </UiAvatar>
                  <p>
                    {{ friend.username }}
                  </p>
                </li>
              </ul>
              <UiSeparator />
              <UiDialogFooter>
                <UiButton
                  class="cursor-pointer"
                  @click="handleInvitaionSent"
                  :disabled="!canSendInvitation"
                >
                  Send Invitation
                </UiButton>
              </UiDialogFooter>
            </UiDialogContent>
          </UiDialog>
        </div>
        <UiButton
          v-if="!$$game.flags.matchmaking.isFindingMatch"
          v-disabled-click="!canFindMatch"
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
    <section
      v-if="$$game.players.user.flags.isInvited"
      aria-role="invitation"
      class="my-6 h-34 p-5 border border-border w-[max(25rem,40vw)] rounded-sm"
    >
      <h1 class="text-center font-bold text-lg">GAME INVITE</h1>
      <UiSeparator class="mt-2 mb-4" />
      <div class="flex px-2 justify-center gap-6">
        <div class="flex items-center gap-2">
          <UiAvatar>
            <UiAvatarImage :src="$$game.players.opponent.info.avatarUrl!" />
          </UiAvatar>
          <div class="leading-tight text-sm">
            <p class="font-bold">
              {{ $$game.players.opponent.info.username }}
            </p>
            <p class="opacity-70">
              {{ $$game.players.opponent.info.university }}
            </p>
          </div>
        </div>
        <div class="gap-2 flex items-center">
          <UiButton @click="handleAccept" class="cursor-pointer h-8 text-xs">
            Accept
          </UiButton>
          <UiButton
            variant="outline"
            @click="handleLeaveOrDecline"
            class="cursor-pointer h-8 text-xs"
          >
            Reject
          </UiButton>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.disabled-invitation {
  opacity: 50%;
  pointer-events: none;
}

.selected-invitation {
  background-color: var(--color-ring);
}

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
