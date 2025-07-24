const protectedRoutes = ["login"];
export default defineNuxtRouteMiddleware((to, from) => {
	const { status } = useAuth();
	console.log("Middleware status:", status.value);
	if (
		status.value !== "authenticated" &&
		!protectedRoutes.includes(to.name)
	) {
		return { name: "login" };
	}
});
