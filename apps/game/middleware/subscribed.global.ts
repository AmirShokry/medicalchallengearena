export default defineNuxtRouteMiddleware((to, from) => {
  const { data } = useAuth();
  if (!data.value?.user.isSubscribed) {
    if (to.path.startsWith("/game")) return { name: "index", hash: "#pricing" };
  }
});
