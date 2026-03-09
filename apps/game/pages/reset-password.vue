<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { EyeIcon, EyeOffIcon, CheckCircleIcon, ArrowLeftIcon } from "lucide-vue-next";

definePageMeta({
  layout: "blank",
  middleware: "protected",
});

const route = useRoute();
const token = computed(() => (route.query.token as string) || "");

const password = ref("");
const confirmPassword = ref("");
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");
const success = ref(false);

const canSubmit = computed(
  () =>
    password.value.length >= 6 &&
    password.value === confirmPassword.value &&
    !isLoading.value &&
    token.value
);

const passwordMismatch = computed(
  () => confirmPassword.value && password.value !== confirmPassword.value
);

const handleReset = async () => {
  if (!canSubmit.value) return;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const { $trpc } = useNuxtApp();
    await $trpc.auth.resetPassword.mutate({
      token: token.value,
      newPassword: password.value,
    });
    success.value = true;
  } catch (error: any) {
    errorMessage.value =
      error.data?.message || error.message || "Failed to reset password. The link may have expired.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div
    class="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10"
  >
    <div class="w-full max-w-sm md:max-w-3xl p-10 rounded-sm bg-background">
      <div class="flex flex-col gap-6">
        <Card class="overflow-hidden p-0">
          <CardContent class="grid p-0 md:grid-cols-2">
            <!-- No token -->
            <div v-if="!token" class="p-6 md:p-8 flex flex-col gap-6">
              <div class="flex flex-col items-center text-center gap-4">
                <h1 class="text-2xl font-bold">Invalid Link</h1>
                <p class="text-muted-foreground text-balance">
                  This password reset link is invalid or missing. Please request a new one.
                </p>
              </div>
              <NuxtLink to="/forgot-password">
                <Button class="w-full">Request New Link</Button>
              </NuxtLink>
            </div>

            <!-- Success State -->
            <div v-else-if="success" class="p-6 md:p-8 flex flex-col gap-6">
              <div class="flex flex-col items-center text-center gap-4">
                <div
                  class="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900"
                >
                  <CheckCircleIcon class="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 class="text-2xl font-bold">Password Reset!</h1>
                <p class="text-muted-foreground text-balance">
                  Your password has been successfully updated. You can now log
                  in with your new password.
                </p>
              </div>
              <NuxtLink to="/login">
                <Button class="w-full">
                  <ArrowLeftIcon class="mr-2 h-4 w-4" />
                  Go to Login
                </Button>
              </NuxtLink>
            </div>

            <!-- Form State -->
            <form v-else class="p-6 md:p-8" @submit.prevent="handleReset">
              <div class="flex flex-col gap-6">
                <div class="flex flex-col items-center text-center">
                  <h1 class="text-2xl font-bold">Reset Password</h1>
                  <p class="text-muted-foreground text-balance">
                    Enter your new password below
                  </p>
                </div>

                <div v-if="errorMessage" class="text-sm text-red-500 text-center">
                  {{ errorMessage }}
                </div>

                <div class="grid gap-3">
                  <Label for="password">New Password</Label>
                  <div class="relative">
                    <Input
                      v-model="password"
                      id="password"
                      :type="showPassword ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="At least 6 characters"
                      required
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      @click="showPassword = !showPassword"
                    >
                      <EyeIcon v-if="!showPassword" class="h-4 w-4" />
                      <EyeOffIcon v-else class="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div class="grid gap-3">
                  <Label for="confirmPassword">Confirm Password</Label>
                  <Input
                    v-model="confirmPassword"
                    id="confirmPassword"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Repeat your new password"
                    required
                  />
                  <p v-if="passwordMismatch" class="text-xs text-red-500">
                    Passwords do not match.
                  </p>
                </div>

                <Button
                  type="submit"
                  class="w-full"
                  :disabled="!canSubmit"
                >
                  {{ isLoading ? "Resetting..." : "Reset Password" }}
                </Button>

                <div class="text-center text-sm">
                  <NuxtLink to="/login" class="underline underline-offset-4">
                    Back to Login
                  </NuxtLink>
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
      </div>
    </div>
  </div>
</template>
