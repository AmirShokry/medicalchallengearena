import type { RouteLocationNormalized } from "vue-router";

const protectedRoutes: RouteLocationNormalized["name"][] = [
  "login",
  "register",
  "ranks",
  "about",
  "contact",
  "terms",
  "privacy",
];
export default defineNuxtRouteMiddleware((to, from) => {
  const { status } = useAuth();
  if (
    status.value !== "authenticated" &&
    !protectedRoutes.includes(to.name) &&
    to.name !== "index"
  ) {
    return { name: "index" };
  }
});
