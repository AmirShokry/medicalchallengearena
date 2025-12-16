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
  
  // Debug logging for production issues
  if (to.path.includes('/exam/multi')) {
    console.log("[Auth Middleware] Route:", to.path);
    console.log("[Auth Middleware] Auth status:", status.value);
    console.log("[Auth Middleware] Route name:", to.name);
    console.log("[Auth Middleware] Protected?", protectedRoutes.includes(to.name));
  }
  
  if (
    status.value !== "authenticated" &&
    !protectedRoutes.includes(to.name) &&
    to.name !== "index"
  ) {
    console.log("[Auth Middleware] Redirecting to index, not authenticated. Route:", to.path);
    return { name: "index" };
  }
});
