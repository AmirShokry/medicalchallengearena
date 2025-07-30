import type { RouteLocationNormalized } from "vue-router";

const protectedRoutes: RouteLocationNormalized["name"][] = [
	"login",
	"register",
];
export default defineNuxtRouteMiddleware((to, from) => {
	const { status } = useAuth();

	if (status.value === "authenticated") {
		if (protectedRoutes.includes(to.name)) return { name: "lobby" };
	}
});
