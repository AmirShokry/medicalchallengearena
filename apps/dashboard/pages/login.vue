<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogInIcon } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
definePageMeta({
	title: "Login",
	layout: "blank",
});
const form = ref(getInitialFormData()),
	errorMessage = ref<string>();

const router = useRouter();
const { signIn } = useAuth();

const handleLogin = async () => {
	try {
		if (!canLogin.value) return;
		const result = await signIn("credentials", {
			usernameOrEmail: form.value.usernameOrEmail,
			password: form.value.password,
			redirect: true,
			callbackUrl: "/",
		});

		if (result?.error) {
			alert(result.error);
			return;
		}

		resetForm();
		router.replace({ name: "index" });
	} catch (error: any) {
		errorMessage.value = error.data.message;
		console.log("Logging in with form data:", errorMessage.value);
	}
};

const resetForm = () => (form.value = getInitialFormData());

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
									<h1 class="text-2xl font-bold">Welcome</h1>
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
										autocomplete="email"
										required />
								</div>
								<div class="grid gap-3">
									<div class="flex items-center">
										<Label for="password">Password</Label>
									</div>
									<Input
										v-model="form.password"
										autocomplete="current-password"
										id="password"
										type="password"
										required />
								</div>
								<Button
									type="submit"
									class="w-full"
									@click.prevent="handleLogin"
									:disabled="!canLogin">
									<LogInIcon class="mr-2" />
									Login
								</Button>
								<div class="grid grid-cols-3 gap-4"></div>
							</div>
						</form>
						<div class="bg-muted relative hidden md:block">
							<img
								alt="Image"
								src="@/assets/images/gray.webp"
								class="absolute inset-0 h-full w-full object-cover object-[center_-0.2rem] dark:grayscale" />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</div>
</template>
