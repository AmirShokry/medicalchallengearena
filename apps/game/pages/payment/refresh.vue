<script setup lang="ts">
import { ref, onMounted } from "vue";
const { signOut } = useAuth();

const showCheck = ref(false);
onMounted(async () => {
  setTimeout(async () => {
    showCheck.value = true;
    await signOut();
  }, 5000); // 1.2s spinning before checkmark
});
</script>
<template>
  <div class="h-svh w-full flex items-center justify-center">
    <div class="flex flex-col gap-4 items-center">
      <div class="mb-4">
        <svg
          v-if="!showCheck"
          class="animate-spin h-16 w-16 text-green-500"
          viewBox="0 0 50 50"
        >
          <circle
            class="opacity-25"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            stroke-width="5"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M25 5a20 20 0 0 1 20 20h-5a15 15 0 0 0-15-15V5z"
          />
        </svg>
        <svg
          v-else
          class="h-16 w-16 text-green-500 transition-all duration-500"
          viewBox="0 0 50 50"
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            stroke-width="5"
            class="opacity-25"
          />
          <polyline
            points="15,27 23,35 36,18"
            fill="none"
            stroke="currentColor"
            stroke-width="5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <p class="text-2xl text-center">
        Your payment has been processed successfully.
      </p>
      <p>You need to sign in to continue using our services</p>
    </div>
  </div>
</template>
