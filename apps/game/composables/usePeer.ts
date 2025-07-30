import { Peer, type DataConnection } from "peerjs";
import { ref, watch, type Ref } from "vue";

interface OpponentConnection {
  username: string;
  peerId: string;
  connection?: DataConnection;
  lastSeen: number;
  status: "online" | "offline" | "connecting" | "busy";
  retryCount: number;
  heartbeatInterval?: ReturnType<typeof setInterval>;
  timeoutId?: ReturnType<typeof setTimeout>;
}

// Global state
let peerInstance: InstanceType<typeof Peer> | null = null;
let connections = new Map<string, OpponentConnection>();
let isPeerReady = false;
let pendingConnections: string[] = [];
let myStatus: "online" | "offline" | "busy" = "offline"; // Track local user's status

const MAX_RETRY_ATTEMPTS = 3;
const HEARTBEAT_INTERVAL = 5000;
const CONNECTION_TIMEOUT = 10000;

let messageCallback: ((from: string, message: any) => void) | null = null;
let friendStatusCallback:
  | ((username: string, status: "online" | "offline" | "busy") => void)
  | null = null;

// Track intervals and timeouts for cleanup
let activeIntervals: ReturnType<typeof setInterval>[] = [];
let activeTimeouts: ReturnType<typeof setTimeout>[] = [];

function cleanup() {
  // Clear all intervals
  activeIntervals.forEach((interval) => clearInterval(interval));
  activeIntervals = [];

  // Clear all timeouts
  activeTimeouts.forEach((timeout) => clearTimeout(timeout));
  activeTimeouts = [];

  // Close all connections
  connections.forEach((conn) => {
    if (conn.connection) {
      try {
        conn.connection.close();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  // Destroy peer instance
  if (peerInstance) {
    try {
      peerInstance.destroy();
    } catch (e) {
      // Ignore cleanup errors
    }
    peerInstance = null;
  }

  // Clear state
  connections.clear();
  isPeerReady = false;
  pendingConnections = [];
  messageCallback = null;
  friendStatusCallback = null;
  myStatus = "offline";
}

function initPeer(usernameRef: Ref<string | undefined>) {
  // Clean up any existing state
  cleanup();

  watch(usernameRef, (username) => {
    if (!username) return;

    try {
      peerInstance = new Peer(`medicalchallengearena-${username}`, {
        secure: true,
      });
    } catch (e) {
      console.error("Failed to create Peer instance:", e);
      return;
    }

    peerInstance.on("open", (id: string) => {
      console.log(`Connected to peerJS with ID: ${id}`);
      isPeerReady = true;
      myStatus = "online"; // Default to online on connection
      // Process any pending connections
      pendingConnections.forEach((friendUsername) => {
        connectToUser(friendUsername);
      });
      pendingConnections = [];
    });

    peerInstance.on("connection", (incomingConn) => {
      const opponentUsername = incomingConn.peer.replace(
        "medicalchallengearena-",
        ""
      );
      connections.set(opponentUsername, {
        lastSeen: Date.now(),
        username: opponentUsername,
        connection: incomingConn,
        peerId: incomingConn.peer,
        status: "connecting",
        retryCount: 0,
      });

      // Set connection timeout
      const timeoutId = setTimeout(() => {
        const conn = connections.get(opponentUsername);
        if (conn && conn.status === "connecting") {
          handleDisconnection(opponentUsername);
        }
      }, CONNECTION_TIMEOUT);
      activeTimeouts.push(timeoutId);
      const conn = connections.get(opponentUsername);
      if (conn) {
        conn.timeoutId = timeoutId;
      }

      console.log(`#S1 Incoming connection from ${opponentUsername}`);

      incomingConn.on("open", () => {
        const conn = connections.get(opponentUsername);
        if (conn) {
          const oldStatus = conn.status;
          // Only set to online if not already in a custom state
          if (conn.status !== "busy") {
            conn.status = "online";
          }
          conn.lastSeen = Date.now();
          conn.retryCount = 0;
          if (conn.timeoutId) {
            clearTimeout(conn.timeoutId);
            activeTimeouts = activeTimeouts.filter((t) => t !== conn.timeoutId);
            delete conn.timeoutId;
          }
          // Send current status to the newly connected peer
          try {
            incomingConn.send({ type: "status-update", status: myStatus });
            console.log(`Sent my status ${myStatus} to ${opponentUsername}`);
          } catch (e) {
            console.error(`Failed to send status to ${opponentUsername}:`, e);
          }
          startHeartbeat(opponentUsername);
          console.log(`#S1 Connected to ${opponentUsername}`);
          if (oldStatus !== conn.status && friendStatusCallback) {
            friendStatusCallback(opponentUsername, conn.status);
          }
        }
      });

      incomingConn.on("data", (data: any) => {
        handleIncomingData(opponentUsername, data);
      });

      incomingConn.on("close", () => {
        handleDisconnection(opponentUsername);
      });

      incomingConn.on("error", (err) => {
        console.error(
          `#E1 Error in incoming connection with ${opponentUsername}:`,
          err
        );
        handleDisconnection(opponentUsername);
      });
    });
  });
}

function connectToFriends(friendsUsernamesRef: Ref<string[] | undefined>) {
  watch(
    friendsUsernamesRef,
    (friendsUsernames) => {
      if (!friendsUsernames || !friendsUsernames.length) return;
      for (const friendUsername of friendsUsernames) {
        connectToUser(friendUsername);
      }
    },
    { immediate: true }
  );
}

function connectToUser(friendUsername: string) {
  if (!isPeerReady || !peerInstance) {
    console.log(`Peer not ready yet, queuing connection to ${friendUsername}`);
    if (!pendingConnections.includes(friendUsername)) {
      pendingConnections.push(friendUsername);
    }
    return;
  }

  let opponentPeer = connections.get(friendUsername);
  if (
    opponentPeer?.status === "online" ||
    opponentPeer?.status === "connecting" ||
    opponentPeer?.status === "busy"
  ) {
    return;
  }

  const oldStatus = opponentPeer?.status as
    | "online"
    | "offline"
    | "connecting"
    | "busy"
    | undefined;
  const existingRetryCount = opponentPeer?.retryCount ?? 0;

  connections.set(friendUsername, {
    username: friendUsername,
    peerId: `medicalchallengearena-${friendUsername}`,
    connection: undefined,
    lastSeen: Date.now(),
    status: "connecting",
    retryCount: existingRetryCount,
  });

  if (oldStatus !== "connecting" && friendStatusCallback) {
    friendStatusCallback(friendUsername, "offline");
  }

  console.log(`Connecting to ${friendUsername}`);

  let connection: DataConnection;
  try {
    connection = peerInstance.connect(
      `medicalchallengearena-${friendUsername}`
    );
  } catch (e) {
    console.error(`Failed to create connection to ${friendUsername}:`, e);
    handleConnectionFailure(friendUsername);
    return;
  }

  connections.set(friendUsername, {
    username: friendUsername,
    peerId: connection.peer,
    connection,
    lastSeen: Date.now(),
    status: "connecting",
    retryCount: existingRetryCount,
  });

  const timeoutId = setTimeout(() => {
    const conn = connections.get(friendUsername);
    if (conn && conn.status === "connecting") {
      handleConnectionFailure(friendUsername);
    }
  }, CONNECTION_TIMEOUT);
  activeTimeouts.push(timeoutId);
  const conn = connections.get(friendUsername);
  if (conn) {
    conn.timeoutId = timeoutId;
  }

  connection.on("open", () => {
    const conn = connections.get(friendUsername);
    if (conn) {
      const oldStatus = conn.status;
      // Only set to online if not already in a custom state
      if (conn.status !== "busy") {
        conn.status = "online";
      }
      conn.lastSeen = Date.now();
      conn.retryCount = 0;
      if (conn.timeoutId) {
        clearTimeout(conn.timeoutId);
        activeTimeouts = activeTimeouts.filter((t) => t !== conn.timeoutId);
        delete conn.timeoutId;
      }
      // Send current status to the newly connected peer
      try {
        connection.send({ type: "status-update", status: myStatus });
        console.log(`Sent my status ${myStatus} to ${friendUsername}`);
      } catch (e) {
        console.error(`Failed to send status to ${friendUsername}:`, e);
      }
      startHeartbeat(friendUsername);
      console.log(`#S2 Connected to ${friendUsername}`);
      if (oldStatus !== conn.status && friendStatusCallback) {
        friendStatusCallback(friendUsername, conn.status);
      }
    }
  });

  connection.on("data", (data: any) => {
    handleIncomingData(friendUsername, data);
  });

  connection.on("error", (err) => {
    console.error(`#E2 Error in connection with ${friendUsername}:`, err);
    handleConnectionFailure(friendUsername);
  });

  connection.on("close", () => {
    console.log(`#E3 Connection closed with ${friendUsername}`);
    handleDisconnection(friendUsername);
  });
}

function handleIncomingData(username: string, data: any) {
  const opponentPeer = connections.get(username);
  if (!opponentPeer) return;

  opponentPeer.lastSeen = Date.now();

  if (data && typeof data === "object" && data.type === "heartbeat") {
    try {
      opponentPeer.connection?.send({ type: "heartbeat-response" });
    } catch (e) {
      console.error(`Failed to send heartbeat response to ${username}:`, e);
    }
    return;
  }

  if (data && typeof data === "object" && data.type === "heartbeat-response") {
    return;
  }

  if (data && typeof data === "object" && data.type === "status-update") {
    const oldStatus = opponentPeer.status;
    if (["online", "offline", "busy"].includes(data.status)) {
      opponentPeer.status = data.status as "online" | "offline" | "busy";
      console.log(`${username} updated status to ${data.status}`);
      if (oldStatus !== data.status && friendStatusCallback) {
        friendStatusCallback(username, data.status);
      }
    }
    return;
  }

  console.log(`Received data from ${username}:`, data);
  if (messageCallback) messageCallback(username, data);
}

function startHeartbeat(username: string) {
  const opponentPeer = connections.get(username);
  if (
    !opponentPeer ||
    (opponentPeer.status !== "online" && opponentPeer.status !== "busy")
  )
    return;

  if (opponentPeer.heartbeatInterval) {
    clearInterval(opponentPeer.heartbeatInterval);
    activeIntervals = activeIntervals.filter(
      (i) => i !== opponentPeer.heartbeatInterval
    );
  }

  const intervalId = setInterval(() => {
    const conn = connections.get(username);
    if (
      conn &&
      (conn.status === "online" || conn.status === "busy") &&
      conn.connection?.open
    ) {
      try {
        conn.connection.send({ type: "heartbeat" });
        if (Date.now() - conn.lastSeen > HEARTBEAT_INTERVAL * 3) {
          console.warn(`Heartbeat timeout for ${username}`);
          handleDisconnection(username);
        }
      } catch (err) {
        console.error(`Failed to send heartbeat to ${username}:`, err);
        handleDisconnection(username);
      }
    } else {
      if (conn?.heartbeatInterval) {
        activeIntervals = activeIntervals.filter(
          (i) => i !== conn.heartbeatInterval
        );
        delete conn.heartbeatInterval;
      }
    }
  }, HEARTBEAT_INTERVAL);
  activeIntervals.push(intervalId);
  opponentPeer.heartbeatInterval = intervalId;
}

function handleDisconnection(username: string) {
  const opponentPeer = connections.get(username);
  if (!opponentPeer) return;

  const oldStatus = opponentPeer.status;

  if (opponentPeer.heartbeatInterval) {
    clearInterval(opponentPeer.heartbeatInterval);
    activeIntervals = activeIntervals.filter(
      (i) => i !== opponentPeer.heartbeatInterval
    );
    delete opponentPeer.heartbeatInterval;
  }

  if (opponentPeer.timeoutId) {
    clearTimeout(opponentPeer.timeoutId);
    activeTimeouts = activeTimeouts.filter((t) => t !== opponentPeer.timeoutId);
    delete opponentPeer.timeoutId;
  }

  opponentPeer.status = "offline";
  opponentPeer.connection = undefined;

  console.log(`Disconnected from ${username}`);
  if (oldStatus !== "offline" && friendStatusCallback) {
    friendStatusCallback(username, "offline");
  }

  if (opponentPeer.retryCount < MAX_RETRY_ATTEMPTS) {
    opponentPeer.retryCount++;
    console.log(
      `Scheduling retry for ${username} (attempt ${opponentPeer.retryCount}/${MAX_RETRY_ATTEMPTS})`
    );
    const timeoutId = setTimeout(() => {
      const conn = connections.get(username);
      if (
        conn &&
        conn.status === "offline" &&
        conn.retryCount === opponentPeer.retryCount
      ) {
        connectToUser(username);
      }
    }, 5000);
    activeTimeouts.push(timeoutId);
  } else {
    console.warn(`Max retry attempts reached for ${username}. Giving up.`);
  }
}

function handleConnectionFailure(username: string) {
  const opponentPeer = connections.get(username);
  if (!opponentPeer) return;

  if (opponentPeer.timeoutId) {
    clearTimeout(opponentPeer.timeoutId);
    activeTimeouts = activeTimeouts.filter((t) => t !== opponentPeer.timeoutId);
    delete opponentPeer.timeoutId;
  }

  handleDisconnection(username);
}

function sendMessage(friendUsername: string, message: any) {
  const opponentPeer = connections.get(friendUsername);
  if (!opponentPeer) {
    console.warn(`No connection found for ${friendUsername}`);
    return;
  }

  if (!opponentPeer.connection || !opponentPeer.connection.open) {
    console.warn(`Connection to ${friendUsername} is not open`);
    return;
  }

  try {
    opponentPeer.connection.send(message);
    opponentPeer.lastSeen = Date.now();
    console.log(`Sent message to ${friendUsername}:`, message);
  } catch (err) {
    console.error(`Failed to send message to ${friendUsername}:`, err);
    handleDisconnection(friendUsername);
  }
}

function setStatus(newStatus: "online" | "offline" | "busy") {
  if (!peerInstance || !isPeerReady) {
    console.warn("Cannot set status: Peer is not ready");
    return;
  }

  myStatus = newStatus;
  console.log(`Set my status to ${newStatus}`);

  connections.forEach((conn) => {
    if (conn.connection?.open) {
      try {
        conn.connection.send({ type: "status-update", status: newStatus });
        console.log(
          `Notified ${conn.username} of status change to ${newStatus}`
        );
      } catch (err) {
        console.error(`Failed to send status update to ${conn.username}:`, err);
        handleDisconnection(conn.username);
      }
    }
  });
}

function getStatus(friendUsername: string): "online" | "offline" | "busy" {
  const opponentPeer = connections.get(friendUsername);
  if (opponentPeer) return opponentPeer.status as "online" | "offline" | "busy";
  if (!peerInstance || !isPeerReady) return "offline";
  return "offline";
}

function onMessage(callback: (from: string, message: any) => void) {
  messageCallback = callback;
}

function onFriendStatus(
  callback: (username: string, status: "online" | "offline" | "busy") => void
) {
  friendStatusCallback = callback;
}

// Handle HMR properly
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log("HMR: Cleaning up peer connections");
    cleanup();
  });
}

export default function usePeer() {
  return {
    initPeer,
    connectToFriends,
    connectToUser,
    onFriendStatus,
    onMessage,
    sendMessage,
    cleanup,
    getConnections: () => connections,
    getStatus,
    setStatus,
  };
}
