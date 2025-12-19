<script setup lang="ts">
definePageMeta({
  layout: "home",
});

useSeoMeta({
  title: "MCA | Home",
  description:
    "Compete with friends, track your progress, and ace your medical exams with Medical Challenge Arena.",
});
const isTouchingPrice = ref(false);

const { status, data } = useAuth();

const router = useRouter();
const { checkOut } = useStripe();
function handleGoClick() {
  if (status.value === "authenticated") router.push({ name: "game-lobby" });
  else router.push({ name: "login" });
}

// function handleSubscribeClick(lookupKey: string) {
//   if (status.value === "authenticated") checkOut(lookupKey);
//   else router.push({ name: "register" });
// }
// const subscribtionButtonText = computed(() => {
//   if (data.value?.user.isSubscribed) return "Manage Subscription";
//   return "Subscribe";
// });
</script>
<template>
  <div class="px-6 pb-10 font-geist">
    <section
      class="[background:radial-gradient(ellipse_at_top,_rgba(255,140,59,1)_30%,_rgba(0,0,0,0)_75%)] rounded-3xl overflow-clip mb-10"
    >
      <div
        class="min-h-[calc(100svh-10rem)] py-4 flex flex-col items-center pt-48 max-sm:pt-34 gap-4 bg-[url(/assets/images/house-scrub.png)] bg-no-repeat bg-[center_-14rem]"
      >
        <p
          class="text-center text-8xl max-sm:text-[calc(max(4.5rem,20vmin))] tracking-tight font-bold text-shadow-2xs isolation-auto text-white"
        >
          <span>Master Me</span>
          <span class="mix-blend-difference">dicine</span>
          <span> Together </span>
        </p>
        <p
          class="px-1 text-center text-2xl font-semibold text-white/90 text-shadow-lg backdrop-brightness-75"
        >
          Connect, Compete, and Conquer the USMLE!
        </p>
        <UiButton
          @click="handleGoClick"
          class="cursor-pointer min-h-12 bg-primary px-4 rounded-xl text-background font-semibold"
        >
          Let's go
        </UiButton>
      </div>
    </section>
    <HomeVideos />
    <section id="pricing" class="rounded-2xl overflow-hidden"></section>
    <HomeTestimonials class="mb-30" />
  </div>
</template>
