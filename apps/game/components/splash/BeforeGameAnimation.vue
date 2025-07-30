<script setup lang="ts">
import AvsB from "./PlayerVersusOpponentSplash.vue";
import { sounds } from "~/composables/audio.client";

const props = defineProps<{
  startImmediately?: boolean;
}>();

const counter = ref<number | string>(3);
const emit = defineEmits(["end"]);
const isCountDownVisible = ref(false);
let countDownInterval = undefined as ReturnType<typeof setInterval> | undefined;

setTimeout(() => showCountDown(), props.startImmediately ? 0 : 1000);
function showCountDown() {
  sounds.count_down.play();
  isCountDownVisible.value = true;
  countDownInterval = setInterval(() => {
    counter.value = (counter.value as number) - 1;
    if (counter.value - 1 < 0) {
      clearInterval(countDownInterval);
      counter.value = "Go!";
      setTimeout(() => {
        emit("end");
      }, 1000);
    }
  }, 1000);
}

onBeforeUnmount(() => clearInterval(countDownInterval));
</script>
<template>
  <slot name="user-vs-opponent">
    <AvsB v-if="!isCountDownVisible" />
  </slot>
  <slot name="count-down">
    <div
      v-if="isCountDownVisible"
      class="fixed left-0 top-0 z-50 w-dvw h-dvh bg-black/50 flex justify-center items-center text-[20vmax]"
    >
      <p class="splash-countdown">{{ counter }}</p>
    </div>
  </slot>
</template>
<style scoped>
@keyframes counterAnimation {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(2);
    opacity: 0.5;
  }
}
.splash-countdown {
  animation: counterAnimation 1s 3 forwards;
  color: white;
}
</style>
