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

function handleSubscribeClick(lookupKey: string) {
  if (status.value === "authenticated") checkOut(lookupKey);
  else router.push({ name: "register" });
}
const subscribtionButtonText = computed(() => {
  if (data.value?.user.isSubscribed) return "Manage Subscription";
  return "Subscribe";
});
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
    <section
      id="pricing"
      class="min-h-[calc(100svh-10rem)] rounded-2xl overflow-hidden"
    >
      <div class="flex h-full py-[calc(4rem+6svh)] px-[clamp(1rem,4svw,6rem)]">
        <div class="flex-1 flex flex-col gap-4">
          <h2 class="text-4xl font-bold text-primary">Pricing</h2>
          <p class="text-lg text-muted-foreground">
            Choose the plan that suits you best.
          </p>
          <div class="flex gap-6 max-lg:flex-col w-full px-2 flex-wrap">
            <div
              class="flex-1 flex flex-col gap-2 py-10 px-8 rounded-sm border border-border"
            >
              <p class="text-lg">Basic</p>
              <p class="font-bold text-4xl">
                99$
                <span class="text-lg font-normal">/month</span>
              </p>
              <p class="border border-border my-2 group-hover:border-white"></p>
              <ul class="text-base">
                <li>Access to multiplayer game</li>
                <li>Access to study partner match up</li>
                <li>Limited access to course material</li>
                <li>Progress tracking</li>
              </ul>
              <a
                class="w-full mt-auto"
                href="https://payhip.com/order?link=2G3no&pricing_plan=ZjBLrKZMWm&builder_mode=1&environment_id_encrypted=w9B31l2jWR"
                target="_blank"
              >
                <UiButton class="mt-auto cursor-pointer w-full">
                  Subscribe
                </UiButton>
              </a>
            </div>
            <div
              @touchstart="isTouchingPrice = true"
              @touchend="isTouchingPrice = false"
              :class="
                isTouchingPrice
                  ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-pink-500'
                  : ''
              "
              class="flex-1 flex flex-col gap-2 py-10 px-8 group rounded-sm border-2 [border-image:linear-gradient(to_right,red,green,blue,indigo,violet)_1] hover:bg-gradient-to-r from-red-500 via-yellow-500 to-pink-500"
            >
              <p class="text-lg">Pro</p>
              <p class="font-bold text-4xl">
                250$
                <span class="text-lg font-normal">/quarter</span>
              </p>
              <p
                class="border border-border my-2 group-hover:border-primary"
              ></p>
              <ul class="text-base">
                <li>Everything in basic</li>
                <li>3 months subscription</li>
                <li>Custom personalized sesions</li>
                <li>Full access to course material</li>
                <li>Immediate support to stuck questions</li>
                <li>Early access to new game features</li>
              </ul>

              <a
                class="w-full mt-auto"
                target="_blank"
                href="https://payhip.com/order?link=2G3no&pricing_plan=a6zYK90bGq&builder_mode=1&environment_id_encrypted=w9B31l2jWR"
              >
                <UiButton class="mt-auto cursor-pointer w-full">
                  Subscribe
                </UiButton>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
    <HomeTestimonials class="mb-30" />
  </div>
</template>
