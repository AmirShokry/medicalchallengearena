export function useStripe() {
  const { data } = useAuth();
  async function navigateToStripeDashboard() {
    const res = await $fetch("/api/stripe/create-portal-session", {
      method: "POST",
    });
    console.log("Portal session created:", res);

    if (res && res.url) {
      await navigateTo(res.url, {
        external: true,
      });
    } else console.error("Failed to create portal session");
  }
  async function checkOut(lookupKey: string) {
    if (data.value?.user?.isSubscribed) return navigateToStripeDashboard();
    // const res = await $fetch("/api/auth/refresh")
    const res = await $fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      body: {
        lookupKey,
      },
    });
    console.log("Checkout session created:", res);

    if (res && res.url) {
      await navigateTo(res.url, {
        external: true,
      });
    }
  }

  return {
    navigateToStripeDashboard,
    checkOut,
  };
}
