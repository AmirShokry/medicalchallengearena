<script setup lang="ts">
import {
  type Stripe,
  type StripeElements,
  loadStripe,
} from "@stripe/stripe-js";

let stripe: Stripe | null;
const loading = ref(true);
let elements: StripeElements | null = null;

const config = useRuntimeConfig();
// const mode = useColorMode();
const computedStyle = getComputedStyle(document.documentElement);
const backgroundColor = computedStyle.getPropertyValue("--background").trim();
// const foregroundColor = computedStyle.getPropertyValue("--foreground").trim();
const primaryColor = computedStyle.getPropertyValue("--primary").trim();
// const borderColor = computedStyle.getPropertyValue("--border").trim();
function oklchToHex(oklch: string): string {
  const [l, c, h] = oklch.match(/([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/)!.slice(1);
  if (!l || !c || !h) return "#000000"; // Fallback to black if parsing fails
  const rgb = oklchToRgb(parseFloat(l), parseFloat(c), parseFloat(h));
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}
function oklchToRgb(
  l: number,
  c: number,
  h: number
): { r: number; g: number; b: number } {
  // Convert Oklch to RGB (this is a simplified version, actual conversion may vary)
  const x = c * Math.cos(h);
  const y = c * Math.sin(h);
  const r = Math.round((l + x) * 255);
  const g = Math.round((l + y) * 255);
  const b = Math.round((l - (x + y)) * 255);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
onMounted(async () => {
  stripe = await loadStripe(config.public.STRIPE_PUBLISHABLE_KEY);
  elements = stripe!.elements({
    paymentMethodCreation: "manual",

    paymentMethodTypes: ["card"], // Exclude 'amazon_pay'
    mode: "payment",
    amount: 99,
    currency: "usd",

    appearance: {
      variables: {
        colorPrimary: oklchToHex(primaryColor),
      },
      rules: {
        ".AccordionItem": {
          backgroundColor,
          color: primaryColor,
          border: `0px`,
        },
        ".Label": {
          color: primaryColor,
        },
      },
    },
  });

  const paymentElement = elements.create("payment");
  paymentElement.mount("#payment-element");
  loading.value = false;
});

async function handleSubmit(e: Event) {
  if (loading.value) return;
  if (!stripe || !elements) {
    return;
  }

  loading.value = true;
  try {
    const response = await $fetch("/api/stripe/stripe-buy", {
      body: {
        lookupKey: "basic_monthly",
      },
      method: "post",
    });

    if (!response) return;

    const { secret: clientSecret } = response!;
    const { error: submitError } = await elements.submit();

    if (submitError) {
      loading.value = false;
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${config.public.NUXT_BASE_URL}/payment/success`,
      },
    });

    loading.value = false;
    if (error.type === "card_error" || error.type === "validation_error")
      alert(error.message);
  } catch (err) {
    console.error("Payment submission failed:", err);
    loading.value = false;
  }
}
</script>
<template>
  <div class="flex flex-col gap-4 w-3/4">
    <div id="payment-element" />
    <UiButton class="ml-auto" :disabled="loading" @click="handleSubmit">
      Submit
    </UiButton>
  </div>
</template>
