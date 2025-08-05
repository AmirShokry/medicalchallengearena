<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { cn } from "@/lib/utils";

definePageMeta({
  layout: "blank",
  middleware: "protected",
});
const form = ref(getInitialFormData());

function getInitialFormData() {
  return {
    username: "",
    email: "",
    password: "",
    university: "",
  };
}
const router = useRouter();
const { signIn } = useAuth();

const isLoading = ref(false);
const errorMessage = ref("");

const handleRegister = async () => {
  try {
    if (!canRegister.value) return;

    isLoading.value = true;
    errorMessage.value = "";

    // Call the registration mutation
    const { $trpc } = useNuxtApp();
    const newUser = await $trpc.auth.register.mutate({
      email: form.value.email,
      password: form.value.password,
      username: form.value.username,
      university: form.value.university,
    });

    // Auto-sign in the user after successful registration
    const result = await signIn("credentials", {
      usernameOrEmail: form.value.email,
      password: form.value.password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(
        "Registration successful, but auto-login failed. Please login manually."
      );
    }

    resetForm();

    router.push({ name: "game-lobby" });

    // await
  } catch (error: any) {
    console.error("Registration error:", error);
    errorMessage.value =
      error.data?.message ||
      error.message ||
      "Registration failed. Please try again.";
  } finally {
    isLoading.value = false;
  }
};

const resetForm = () => {
  form.value = getInitialFormData();
  errorMessage.value = "";
};

const canRegister = computed(
  () =>
    form.value.username &&
    form.value.email &&
    form.value.password &&
    form.value.university &&
    !isLoading.value
);
</script>
<template>
  <div
    class="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10"
  >
    <div class="w-full max-w-sm md:max-w-3xl p-10 rounded-sm bg-background">
      <div :class="cn('flex flex-col gap-6')">
        <Card class="overflow-hidden p-0">
          <CardContent class="grid p-0 md:grid-cols-2">
            <form
              id="register"
              class="p-6 md:p-8"
              @submit.prevent="handleRegister"
            >
              <div class="flex flex-col gap-6">
                <div class="flex flex-col items-center text-center">
                  <h1 class="text-2xl font-bold">Welcome!</h1>
                  <p class="text-muted-foreground text-balance">
                    Create a new MCA Account
                  </p>
                </div>
                <div class="grid gap-3">
                  <Label for="usernameOrEmail">Email</Label>
                  <Input
                    v-model="form.email"
                    form="register"
                    id="email"
                    autocomplete="email"
                    placeholder="m@example.com"
                    required
                  />
                </div>
                <div class="grid gap-3">
                  <Label for="username">Username </Label>
                  <Input
                    v-model="form.username"
                    form="register"
                    autocomplete="username"
                    id="username"
                    type="input"
                    required
                  />
                </div>
                <div class="grid gap-3">
                  <Label for="university">University </Label>
                  <Input
                    v-model="form.university"
                    form="register"
                    id="university"
                    type="input"
                    required
                  />
                </div>
                <div class="grid gap-3">
                  <Label for="password">Password </Label>
                  <Input
                    v-model="form.password"
                    autocomplete="new-password"
                    id="password"
                    form="register"
                    type="password"
                    required
                  />
                </div>

                <!-- Error message -->
                <div
                  v-if="errorMessage"
                  class="text-red-500 text-sm text-center"
                >
                  {{ errorMessage }}
                </div>

                <Button
                  form="register"
                  type="submit"
                  class="w-full"
                  :disabled="!canRegister || isLoading"
                  :class="!canRegister || isLoading ? 'opacity-50' : undefined"
                >
                  <span v-if="isLoading">Registering...</span>
                  <span v-else>Register</span>
                </Button>
                <div class="grid grid-cols-3 gap-4"></div>
                <div class="text-center text-sm">
                  Already have an account?
                  <a href="/login" class="underline underline-offset-4">
                    Login
                  </a>
                </div>
              </div>
            </form>
            <div class="bg-muted relative hidden md:block">
              <img
                alt="Image"
                src="@/assets/images/grey-anatomy.webp"
                class="absolute inset-0 h-full w-full object-cover object-[center_-0.2rem] dark:grayscale"
              />
            </div>
          </CardContent>
        </Card>
        <div
          class="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4"
        >
          By clicking continue, you agree to our
          <a href="https://medicalchallengearena.com/terms">Terms of Service</a>
          and
          <a href="https://medicalchallengearena.com/privacy">Privacy Policy</a
          >.
        </div>
      </div>
    </div>
  </div>
</template>
