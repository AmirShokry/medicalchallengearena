export function useRival() {
  const $$game = useGameStore();
  const peerApi = usePeer();
  const friendStore = useFriendsStore();
  let currentUsername = "";

  // const currentConnection = ref<DataConnection | null>(null);
  const info = computed(() => {
    if (!$$game.players?.opponent.info) return null;
    return $$game.players?.opponent.info;
  });

  const messages = ref<
    {
      text: string;
      self: boolean;
      timestamp: number;
    }[]
  >([]);

  watch(
    info,
    (newInfo) => {
      if (!newInfo) return;
      if (peerApi.connections.get(newInfo.username))
        console.log("Already connected to rival:", newInfo.username);
      else {
        console.log("Connecting to rival:", newInfo.username);
        peerApi.connectToUser(newInfo.username);
      }
      currentUsername = newInfo.username;
    },
    { immediate: true, deep: true }
  );

  peerApi.onRivalMessage((from, data) => {
    console.log("Received data from rival:", data);
    if (from !== info.value?.username) return;
    if (data.text) {
      messages.value.push({
        text: data.text,
        self: false,
        timestamp: data.timestamp,
      });
    }
  });

  function sendMessage(text: string) {
    if (!info.value) return;
    peerApi.sendMessage(info.value.username, {
      text,
      self: false,
      timestamp: Date.now(),
    });

    messages.value.push({
      text,
      self: true,
      timestamp: Date.now(),
    });
  }
  function cleanUpConnection() {
    const rivalUsername = currentUsername;

    // Assume you have a way to get the friend list, e.g. $$game.friends
    const isFriend = friendStore.friendList?.find(
      (friend) => friend.username === rivalUsername
    );
    messages.value = [] as any;
    if (rivalUsername && !isFriend) {
      // Close connection only if rival is NOT a friend
      const conn = peerApi.connections.get(rivalUsername);
      if (conn && conn.connection) {
        try {
          conn.connection.close();
          peerApi.connections.delete(rivalUsername);
          console.log(
            "Closed connection with non-friend rival:",
            rivalUsername
          );
        } catch (e) {
          console.warn(
            "Error closing connection with rival:",
            rivalUsername,
            e
          );
        }
      }
    }
    currentUsername = "";
  }
  watch(
    () => info.value?.username,
    (newUsername, oldUsername) => {
      console.log("I am here");
      console.log("Rival username changed:", newUsername);
      if (oldUsername && oldUsername !== newUsername) {
        currentUsername = oldUsername;
        cleanUpConnection();
      }
      currentUsername = newUsername || "";
    }
  );

  onBeforeUnmount(cleanUpConnection);

  return {
    messages,
    sendMessage,
    info,
  };
}
