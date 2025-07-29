const protectedRoutes = ["login"];
export default defineNuxtRouteMiddleware((to, from) => {
  const { status } = useAuth();

  if (status.value !== "authenticated" && !protectedRoutes.includes(to.name)) {
    return { name: "login" };
  }
});
