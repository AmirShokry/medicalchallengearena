<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MailIcon, ArrowLeftIcon } from "lucide-vue-next";

definePageMeta({
  layout: "blank",
  middleware: "protected",
});

const usernameOrEmail = ref("");
const isLoading = ref(false);
const submitted = ref(false);
const errorMessage = ref("");

const canSubmit = computed(() => usernameOrEmail.value.trim() && !isLoading.value);

const handleSubmit = async () => {
  if (!canSubmit.value) return;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const { $trpc } = useNuxtApp();
    await $trpc.auth.forgotPassword.mutate({
      usernameOrEmail: usernameOrEmail.value.trim(),
    });
    submitted.value = true;
  } catch (error: any) {
    errorMessage.value =
      error.data?.message || error.message || "Something went wrong. Please try again.";
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
            <!-- Success State -->
            <div v-if="submitted" class="p-6 md:p-8 flex flex-col gap-6">
              <div class="flex flex-col items-center text-center gap-4">
                <div
                  class="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900"
                >
                  <MailIcon class="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 class="text-2xl font-bold">Check your email</h1>
                <p class="text-muted-foreground text-balance">
                  If an account exists with that username or email, we've sent a
                  password reset link. Please check your inbox and spam folder.
                </p>
                <p class="text-muted-foreground text-sm">
                  The link expires in 15 minutes.
                </p>
              </div>
              <NuxtLink to="/login">
                <Button variant="outline" class="w-full">
                  <ArrowLeftIcon class="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </NuxtLink>
            </div>

            <!-- Form State -->
            <form v-else class="p-6 md:p-8" @submit.prevent="handleSubmit">
              <div class="flex flex-col gap-6">
                <div class="flex flex-col items-center text-center">
                  <h1 class="text-2xl font-bold">Forgot Password</h1>
                  <p class="text-muted-foreground text-balance">
                    Enter your username or email to receive a reset link
                  </p>
                </div>

                <div v-if="errorMessage" class="text-sm text-red-500 text-center">
                  {{ errorMessage }}
                </div>

                <div class="grid gap-3">
                  <Label for="usernameOrEmail">Username or Email</Label>
                  <Input
                    v-model="usernameOrEmail"
                    id="usernameOrEmail"
                    placeholder="username or m@example.com"
                    autocomplete="email"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  class="w-full"
                  :disabled="!canSubmit"
                >
                  <MailIcon v-if="!isLoading" class="mr-2 h-4 w-4" />
                  {{ isLoading ? "Sending..." : "Send Reset Link" }}
                </Button>

                <div class="text-center text-sm">
                  Remember your password?
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
