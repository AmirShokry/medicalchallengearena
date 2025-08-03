export const useSessionUpdate = () => {
  const hardRefresh = async () => {
    await $fetch("/api/auth/refresh-session-from-db", {
      method: "POST",
      body: {
        forceTokenRefresh: true,
        refreshType: "hard",
      },
    });
  };
  const quickRefresh = async () => {
    await $fetch("/api/auth/refresh-session-from-db", {
      method: "POST",
      body: {
        forceTokenRefresh: true,
        refreshType: "soft",
      },
    });
  };

  return {
    hardRefresh,
    quickRefresh,
  };
};
