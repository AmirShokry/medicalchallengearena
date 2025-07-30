import { defineStore } from "pinia";
import type { AppRouter } from "@/server/api/v1/_trpc/routers";
import type { inferRouterOutputs } from "@trpc/server";

type UserData = inferRouterOutputs<AppRouter>["auth"]["getUserData"];

export const useUserStore = defineStore("user", () => {
	const { $trpc } = useNuxtApp();
	const { status } = useAuth();

	// Use useLazyAsyncData - automatically refetches when status changes
	const { data, error, pending, refresh } = useLazyAsyncData(
		"userData",
		async () => await $trpc.auth.getUserData.query(),
		{
			default: () => null,
			watch: [status],
		}
	);

	return {
		user: data,
		isLoading: readonly(pending),
		error: readonly(error),
		refreshUserData: refresh,
	};
});
