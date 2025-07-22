<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { cn } from "@/lib/utils";

const shouldShow = defineModel("show", { type: Boolean, required: true });
const visibleComponent = defineModel("component", {
	type: String,
	required: true,
});

const form = ref(getInitialFormData());

function getInitialFormData() {
	return {
		username: "",
		email: "",
		accessCode: "",
		password: "",
		university: "",
	};
}
const router = useRouter();
const { $trpc } = useNuxtApp();
const handleRegister = async () => {
	try {
		if (!canRegister.value) return;
		// const user = await $trpc.auth.register.mutate({
		// 	accessCode: form.value.accessCode,
		// 	email: form.value.email,
		// 	password: form.value.password,
		// 	username: form.value.username,
		// 	university: form.value.university,
		// });

		// $$user.saveCredentials(user);
		// $$user.friendList = await $trpc.friends.list.query();
		resetForm();
		shouldShow.value = false;
		router.push({ name: "lobby" });
	} catch (error: any) {
		alert(error.data.message || "Registration failed. Please try again.");
	}
};

const resetForm = () => (form.value = getInitialFormData());
const canRegister = computed(
	() =>
		form.value.username &&
		form.value.email &&
		form.value.password &&
		form.value.accessCode &&
		form.value.university
);
</script>
<template>
	<div
		class="tw:bg-muted tw:flex tw:min-h-svh tw:flex-col tw:items-center tw:justify-center tw:p-6 tw:md:p-10">
		<div
			class="tw:w-full tw:max-w-sm tw:md:max-w-3xl tw:p-10 tw:rounded-sm tw:bg-background">
			<div :class="cn('tw:flex tw:flex-col tw:gap-6')">
				<Card class="tw:overflow-hidden tw:p-0">
					<CardContent class="tw:grid tw:p-0 tw:md:grid-cols-2">
						<form
							id="register"
							class="tw:p-6 tw:md:p-8"
							@submit.prevent="handleRegister">
							<div class="tw:flex tw:flex-col tw:gap-6">
								<div
									class="tw:flex tw:flex-col tw:items-center tw:text-center">
									<h1 class="tw:text-2xl tw:font-bold">
										Welcome!
									</h1>
									<p
										class="tw:text-muted-foreground tw:text-balance">
										Create a new MCA Account
									</p>
								</div>
								<div class="tw:grid tw:gap-3">
									<Label for="usernameOrEmail">Email</Label>
									<Input
										v-model="form.email"
										form="register"
										id="email"
										placeholder="m@example.com"
										required />
								</div>
								<div class="tw:grid tw:gap-3">
									<Label for="username">Username </Label>
									<Input
										v-model="form.username"
										form="register"
										id="username"
										type="input"
										required />
								</div>
								<div class="tw:grid tw:gap-3">
									<Label for="university">University </Label>
									<Input
										v-model="form.university"
										form="register"
										id="university"
										type="input"
										required />
								</div>
								<div class="tw:grid tw:gap-3">
									<Label for="username">Password </Label>
									<Input
										v-model="form.password"
										id="password"
										form="register"
										type="password"
										required />
								</div>
								<div class="tw:grid tw:gap-3">
									<Label for="username">Access Code </Label>
									<Input
										v-model="form.accessCode"
										id="access-code"
										form="register"
										type="input"
										required />
								</div>
								<Button
									form="register"
									type="submit"
									class="tw:w-full"
									:class="
										!canRegister
											? 'tw:opacity-50'
											: undefined
									">
									Register
								</Button>
								<div
									class="tw:grid tw:grid-cols-3 tw:gap-4"></div>
								<div class="tw:text-center tw:text-sm">
									Already have an account?
									<a
										href="/login"
										class="tw:underline tw:underline-offset-4">
										Login
									</a>
								</div>
							</div>
						</form>
						<div
							class="tw:bg-muted tw:relative tw:hidden tw:md:block">
							<img
								src="@client/assets/img/gray.webp"
								alt="Image"
								class="tw:absolute tw:inset-0 tw:h-full tw:w-full tw:object-cover tw:object-[center_-0.2rem] tw:dark:grayscale" />
						</div>
					</CardContent>
				</Card>
				<div
					class="tw:text-muted-foreground tw:*:[a]:hover:text-primary tw:text-center tw:text-xs tw:text-balance tw:*:[a]:underline tw:*:[a]:underline-offset-4">
					By clicking continue, you agree to our
					<a href="https://medicalchallengearena.com/terms"
						>Terms of Service</a
					>
					and
					<a href="https://medicalchallengearena.com/privacy"
						>Privacy Policy</a
					>.
				</div>
			</div>
		</div>
	</div>
</template>
