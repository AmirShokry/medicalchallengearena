<script setup lang="ts">
const userStore = useUserStore();
const friendStore = useFriendsStore();
const peerApi = usePeer();

peerApi.initPeer(computed(() => userStore.user?.username));
peerApi.connectToFriends(
  computed(() => friendStore.friendList?.map((friend) => friend.username))
);

peerApi.onFriendStatus((friend, status) => {
  console.log(`Friend ${friend} is now ${status}`);
  if (!friendStore.friendList) return;
  const friendData = friendStore.friendList.find((f) => f.username === friend);
  if (!friendData) return;
  friendData.status = status;
});

peerApi.onMessage((from, message) => {
  console.log(`Message from ${from}`, message);
  if (!friendStore.friendList) return;
  const friendData = friendStore.friendList.find((f) => f.username === from);
  if (!friendData) return;
  friendData.messages.push({
    type: message.type,
    id: userStore.user?.id || "",
    text: message.text,
    content: message.content,
    timestamp: new Date(),
  });
});
</script>
<template>
  <slot />
</template>
