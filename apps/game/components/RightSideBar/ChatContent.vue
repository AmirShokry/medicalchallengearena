<script setup lang="ts">
const activeFriendId = defineModel<number>({ required: true });
const userStore = useUserStore();
const friendsStore = useFriendsStore();
const activeFriend = computed(() => {
	if (!friendsStore.friendList) return null;
	return friendsStore.friendList.find(
		(friend) => friend.id === activeFriendId.value
	);
});
</script>
<template>
	<ul class="mt-10 px-2 h-full" v-if="activeFriend">
		<li v-if="!activeFriend.messages || activeFriend.messages.length <= 0">
			No messages yet.
		</li>
		<li
			v-for="message in activeFriend.messages"
			:key="message.timestamp.toString()"
			class="flex items-center p-2 gap-2 hover:bg-muted cursor-pointer">
			<UiAvatar class="border border-border h-8 w-8">
				<UiAvatarImage
					v-if="!message.self"
					:src="activeFriend.avatarUrl"
					alt="Avatar" />
				<UiAvatarImage
					v-else-if="userStore.user"
					:src="userStore.user.avatarUrl"
					alt="Avatar" />
			</UiAvatar>
			<div>
				<p class="text-sm">{{ message.text }}</p>
				<p class="text-xs text-muted-foreground">
					{{ new Date(message.timestamp).toLocaleTimeString() }}
				</p>
			</div>
		</li>
	</ul>
</template>
