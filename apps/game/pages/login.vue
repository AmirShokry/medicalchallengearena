<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EyeIcon, EyeOffIcon, XIcon } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
definePageMeta({
	layout: "blank",
	middleware: "protected",
});
const form = ref(getInitialFormData()),
	errorMessage = ref<string>();
const { $trpc } = useNuxtApp();
const router = useRouter();
const { signIn } = useAuth();
const handleLogin = async () => {
	try {
		if (!canLogin.value) return;
		const result = await signIn("credentials", {
			email: form.value.usernameOrEmail,
			password: form.value.password,
			redirect: false,
		});
		if (result?.error) {
			alert(result.error);
			return;
		}
		resetForm();
		router.push({ name: "lobby" });

		// const credentials = await $trpc.auth.login.mutate({ ...form.value });
		// $$user.saveCredentials(credentials);
		// $$user.friendList = await $trpc.friends.list.query();
		// $$user.requests.incoming =
		// await $trpc.friends.requests.incoming.query();

		// shouldShow.value = false;
	} catch (error: any) {
		errorMessage.value = error.data.message;
		console.log("Logging in with form data:", errorMessage.value);
	}
};

const resetForm = () => (form.value = getInitialFormData());
const handleGoToRegister = () => {
	resetForm();
	// visibleComponent.value = "register";
};
const handleForgotPassword = () => alert(`Keep trying! You'll get it`);
const canLogin = computed(
	() => form.value.usernameOrEmail && form.value.password
);
function getInitialFormData() {
	return { usernameOrEmail: "", password: "" };
}
</script>
<template>
	<div
		class="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
		<div class="w-full max-w-sm md:max-w-3xl p-10 rounded-sm bg-background">
			<div class="flex flex-col gap-6">
				<Card class="overflow-hidden p-0">
					<CardContent class="grid p-0 md:grid-cols-2">
						<form class="p-6 md:p-8">
							<div class="flex flex-col gap-6">
								<div
									class="flex flex-col items-center text-center">
									<h1 class="text-2xl font-bold">
										Welcome back
									</h1>
									<p
										class="text-muted-foreground text-balance">
										Login to your MCA Account
									</p>
								</div>
								<div class="grid gap-3">
									<Label for="usernameOrEmail">Email</Label>
									<Input
										v-model="form.usernameOrEmail"
										id="usernameOrEmail"
										placeholder="m@example.com"
										required />
								</div>
								<div class="grid gap-3">
									<div class="flex items-center">
										<Label for="password">Password</Label>
										<a
											@click="handleForgotPassword"
											href="#"
											class="ml-auto text-sm underline-offset-2 hover:underline">
											Forgot your password?
										</a>
									</div>
									<Input
										v-model="form.password"
										id="password"
										type="password"
										required />
								</div>
								<Button
									type="submit"
									class="w-full"
									@click.prevent="handleLogin"
									:disabled="!canLogin">
									<LoginIcon class="mr-2" />
									Login
								</Button>
								<div class="grid grid-cols-3 gap-4"></div>
								<div class="text-center text-sm">
									Don't have an account?
									<a
										href="/register"
										class="underline underline-offset-4">
										Sign up
									</a>
								</div>
							</div>
						</form>
						<div class="bg-muted relative hidden md:block">
							<img
								alt="Image"
								class="absolute inset-0 h-full w-full object-cover object-[center_-0.2rem] dark:grayscale" />
						</div>
					</CardContent>
				</Card>
				<div
					class="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
					By clicking continue, you agree to our
					<a href="#">Terms of Service</a> and
					<a href="#">Privacy Policy</a>.
				</div>
			</div>
		</div>
	</div>
</template>
