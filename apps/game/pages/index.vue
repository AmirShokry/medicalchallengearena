<script setup lang="ts">
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

const heroSection = ref<HTMLElement | null>(null);
const heroVideo = ref<HTMLElement | null>(null);
const heroText = ref<HTMLElement | null>(null);
const geoContainer = ref<HTMLElement | null>(null);

onMounted(() => {
  if (!heroSection.value) return;

  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
  });

  // Animate floating geometric shapes
  const shapes = geoContainer.value?.querySelectorAll(".geo-shape");
  if (shapes) {
    shapes.forEach((shape, i) => {
      // Randomized floating animation per shape
      gsap.to(shape, {
        y: `random(-30, 30)`,
        x: `random(-20, 20)`,
        rotation: `random(-15, 15)`,
        duration: `random(4, 8)`,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: i * 0.3,
      });
      // Fade shapes in
      gsap.fromTo(
        shape,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 1.5, delay: 0.2 + i * 0.15, ease: "power2.out" }
      );
    });
  }

  // Video slides in from left with scale
  tl.fromTo(
    heroVideo.value,
    { x: -120, opacity: 0, scale: 0.9 },
    { x: 0, opacity: 1, scale: 1, duration: 1.2 }
  );

  // Text lines stagger in from right
  const textLines = heroText.value?.querySelectorAll(".hero-line");
  if (textLines) {
    tl.fromTo(
      textLines,
      { x: 80, opacity: 0, y: 20 },
      { x: 0, opacity: 1, y: 0, duration: 0.8, stagger: 0.12 },
      "-=0.8"
    );
  }

  // CTA button pops in
  const ctaBtn = heroText.value?.querySelector(".hero-cta");
  if (ctaBtn) {
    tl.fromTo(
      ctaBtn,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" },
      "-=0.3"
    );
  }
});
</script>
<template>
  <div class="px-6 pb-10 font-geist">
    <section
      ref="heroSection"
      class="hero-section relative rounded-3xl overflow-hidden mb-10"
    >
      <!-- Floating geometric shapes -->
      <div ref="geoContainer" class="absolute inset-0 pointer-events-none overflow-hidden">
        <!-- === GEOMETRIC SHAPES === -->
        <!-- Circles -->
        <svg class="geo-shape absolute top-[5%] left-[3%] opacity-0" width="70" height="70" viewBox="0 0 70 70"><circle cx="35" cy="35" r="30" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[60%] right-[6%] opacity-0" width="90" height="90" viewBox="0 0 90 90"><circle cx="45" cy="45" r="40" fill="none" stroke-width="1" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[80%] left-[45%] opacity-0" width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[30%] left-[85%] opacity-0" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke-width="1" class="geo-stroke" /></svg>

        <!-- Triangles -->
        <svg class="geo-shape absolute top-[18%] right-[12%] opacity-0" width="55" height="55" viewBox="0 0 55 55"><polygon points="27.5,5 50,48 5,48" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute bottom-[12%] left-[10%] opacity-0" width="45" height="45" viewBox="0 0 45 45"><polygon points="22.5,4 40,40 5,40" fill="none" stroke-width="1" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[75%] right-[35%] opacity-0" width="35" height="35" viewBox="0 0 35 35"><polygon points="17.5,3 32,30 3,30" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>

        <!-- Diamonds -->
        <svg class="geo-shape absolute top-[42%] left-[2%] opacity-0" width="50" height="50" viewBox="0 0 50 50"><rect x="9" y="9" width="32" height="32" fill="none" stroke-width="1.5" transform="rotate(45 25 25)" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[8%] right-[55%] opacity-0" width="38" height="38" viewBox="0 0 38 38"><rect x="6" y="6" width="26" height="26" fill="none" stroke-width="1" transform="rotate(45 19 19)" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute bottom-[5%] right-[15%] opacity-0" width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="5" width="20" height="20" fill="none" stroke-width="1.5" transform="rotate(45 15 15)" class="geo-stroke" /></svg>

        <!-- Squares -->
        <svg class="geo-shape absolute top-[12%] left-[30%] opacity-0" width="32" height="32" viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" fill="none" stroke-width="1" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute bottom-[30%] left-[60%] opacity-0" width="28" height="28" viewBox="0 0 28 28"><rect x="3" y="3" width="22" height="22" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>

        <!-- Hexagons -->
        <svg class="geo-shape absolute bottom-[22%] right-[22%] opacity-0" width="60" height="60" viewBox="0 0 60 60"><polygon points="30,3 55,16.5 55,43.5 30,57 5,43.5 5,16.5" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[68%] left-[18%] opacity-0" width="44" height="44" viewBox="0 0 44 44"><polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill="none" stroke-width="1" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[3%] right-[30%] opacity-0" width="36" height="36" viewBox="0 0 36 36"><polygon points="18,2 33,10 33,26 18,34 3,26 3,10" fill="none" stroke-width="1" class="geo-stroke" /></svg>

        <!-- Plus / Cross signs -->
        <svg class="geo-shape absolute top-[33%] right-[4%] opacity-0" width="32" height="32" viewBox="0 0 32 32"><line x1="16" y1="4" x2="16" y2="28" stroke-width="1.5" class="geo-stroke" /><line x1="4" y1="16" x2="28" y2="16" stroke-width="1.5" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute bottom-[8%] left-[48%] opacity-0" width="26" height="26" viewBox="0 0 26 26"><line x1="13" y1="3" x2="13" y2="23" stroke-width="1.5" class="geo-stroke" /><line x1="3" y1="13" x2="23" y2="13" stroke-width="1.5" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[50%] left-[70%] opacity-0" width="22" height="22" viewBox="0 0 22 22"><line x1="11" y1="2" x2="11" y2="20" stroke-width="1.5" class="geo-stroke" /><line x1="2" y1="11" x2="20" y2="11" stroke-width="1.5" class="geo-stroke" /></svg>

        <!-- Dots -->
        <svg class="geo-shape absolute top-[52%] left-[25%] opacity-0" width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="3" class="geo-fill" /></svg>
        <svg class="geo-shape absolute top-[14%] left-[65%] opacity-0" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="2.5" class="geo-fill" /></svg>
        <svg class="geo-shape absolute bottom-[35%] left-[5%] opacity-0" width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="2" class="geo-fill" /></svg>
        <svg class="geo-shape absolute top-[88%] right-[50%] opacity-0" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" class="geo-fill" /></svg>

        <!-- Concentric rings -->
        <svg class="geo-shape absolute bottom-[45%] right-[48%] opacity-0" width="55" height="55" viewBox="0 0 55 55"><circle cx="27.5" cy="27.5" r="22" fill="none" stroke-width="1" class="geo-stroke" /><circle cx="27.5" cy="27.5" r="13" fill="none" stroke-width="1" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[25%] left-[50%] opacity-0" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke-width="1" class="geo-stroke" /><circle cx="20" cy="20" r="9" fill="none" stroke-width="1" class="geo-stroke" /></svg>

        <!-- Pentagons -->
        <svg class="geo-shape absolute top-[40%] right-[62%] opacity-0" width="42" height="42" viewBox="0 0 42 42"><polygon points="21,2 40,15 33,38 9,38 2,15" fill="none" stroke-width="1" class="geo-stroke" /></svg>

        <!-- === MEDICAL SHAPES === -->
        <!-- Medical cross -->
        <svg class="geo-shape absolute top-[7%] left-[42%] opacity-0" width="48" height="48" viewBox="0 0 48 48"><path d="M18,4 h12 v14 h14 v12 h-14 v14 h-12 v-14 h-14 v-12 h14 z" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute bottom-[18%] right-[42%] opacity-0" width="36" height="36" viewBox="0 0 36 36"><path d="M13,3 h10 v10 h10 v10 h-10 v10 h-10 v-10 h-10 v-10 h10 z" fill="none" stroke-width="1" class="geo-stroke" /></svg>

        <!-- Heartbeat / EKG line -->
        <svg class="geo-shape absolute top-[55%] right-[10%] opacity-0" width="100" height="40" viewBox="0 0 100 40"><polyline points="0,20 20,20 28,20 33,5 38,35 43,10 48,25 53,20 100,20" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[85%] left-[8%] opacity-0" width="80" height="32" viewBox="0 0 80 32"><polyline points="0,16 16,16 22,16 26,4 30,28 34,8 38,20 42,16 80,16" fill="none" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="geo-stroke" /></svg>

        <!-- Stethoscope (simplified) -->
        <svg class="geo-shape absolute top-[22%] left-[8%] opacity-0" width="50" height="60" viewBox="0 0 50 60"><path d="M15,5 v20 c0,12 20,12 20,0 v-20" fill="none" stroke-width="1.5" stroke-linecap="round" class="geo-stroke" /><circle cx="25" cy="45" r="8" fill="none" stroke-width="1.5" class="geo-stroke" /><line x1="25" y1="37" x2="25" y2="25" stroke-width="1.5" class="geo-stroke" /></svg>

        <!-- Pill / Capsule -->
        <svg class="geo-shape absolute bottom-[6%] left-[30%] opacity-0" width="50" height="24" viewBox="0 0 50 24"><rect x="3" y="3" width="44" height="18" rx="9" ry="9" fill="none" stroke-width="1.5" class="geo-stroke" /><line x1="25" y1="3" x2="25" y2="21" stroke-width="1" class="geo-stroke" /></svg>
        <svg class="geo-shape absolute top-[38%] right-[30%] opacity-0" width="40" height="20" viewBox="0 0 40 20"><rect x="2" y="2" width="36" height="16" rx="8" ry="8" fill="none" stroke-width="1" class="geo-stroke" /><line x1="20" y1="2" x2="20" y2="18" stroke-width="1" class="geo-stroke" /></svg>

        <!-- DNA Helix (simplified double strand) -->
        <svg class="geo-shape absolute top-[15%] right-[3%] opacity-0" width="40" height="80" viewBox="0 0 40 80"><path d="M8,5 C8,20 32,20 32,35 C32,50 8,50 8,65 C8,75 20,78 32,75" fill="none" stroke-width="1.5" stroke-linecap="round" class="geo-stroke" /><path d="M32,5 C32,20 8,20 8,35 C8,50 32,50 32,65 C32,75 20,78 8,75" fill="none" stroke-width="1.5" stroke-linecap="round" class="geo-stroke" /></svg>

        <!-- Heart (anatomical outline) -->
        <svg class="geo-shape absolute bottom-[50%] left-[40%] opacity-0" width="40" height="38" viewBox="0 0 40 38"><path d="M20,35 C12,28 2,22 2,12 C2,6 6,2 12,2 C16,2 19,4 20,7 C21,4 24,2 28,2 C34,2 38,6 38,12 C38,22 28,28 20,35Z" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>

        <!-- Syringe (simplified) -->
        <svg class="geo-shape absolute top-[72%] right-[60%] opacity-0" width="60" height="20" viewBox="0 0 60 20"><rect x="15" y="4" width="30" height="12" rx="2" fill="none" stroke-width="1.5" class="geo-stroke" /><line x1="45" y1="10" x2="55" y2="10" stroke-width="1.5" stroke-linecap="round" class="geo-stroke" /><line x1="15" y1="10" x2="8" y2="10" stroke-width="1.5" stroke-linecap="round" class="geo-stroke" /><line x1="25" y1="4" x2="25" y2="16" stroke-width="1" class="geo-stroke" /><line x1="32" y1="4" x2="32" y2="16" stroke-width="1" class="geo-stroke" /></svg>

        <!-- Microscope (simplified) -->
        <svg class="geo-shape absolute top-[5%] left-[75%] opacity-0" width="44" height="55" viewBox="0 0 44 55"><path d="M22,5 L22,30" fill="none" stroke-width="2" stroke-linecap="round" class="geo-stroke" /><circle cx="22" cy="33" r="6" fill="none" stroke-width="1.5" class="geo-stroke" /><path d="M10,48 h24" fill="none" stroke-width="2" stroke-linecap="round" class="geo-stroke" /><path d="M22,39 v9" fill="none" stroke-width="1.5" class="geo-stroke" /><circle cx="22" cy="5" r="4" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>

        <!-- Atom / molecule -->
        <svg class="geo-shape absolute bottom-[15%] left-[72%] opacity-0" width="50" height="50" viewBox="0 0 50 50"><ellipse cx="25" cy="25" rx="20" ry="8" fill="none" stroke-width="1" transform="rotate(0 25 25)" class="geo-stroke" /><ellipse cx="25" cy="25" rx="20" ry="8" fill="none" stroke-width="1" transform="rotate(60 25 25)" class="geo-stroke" /><ellipse cx="25" cy="25" rx="20" ry="8" fill="none" stroke-width="1" transform="rotate(120 25 25)" class="geo-stroke" /><circle cx="25" cy="25" r="3" class="geo-fill" /></svg>

        <!-- Rx symbol -->
        <svg class="geo-shape absolute top-[90%] left-[88%] opacity-0" width="36" height="40" viewBox="0 0 36 40"><text x="4" y="32" font-size="32" font-weight="bold" fill="none" stroke-width="1.2" font-family="serif" class="geo-stroke">℞</text></svg>

        <!-- Thermometer -->
        <svg class="geo-shape absolute top-[45%] left-[92%] opacity-0" width="18" height="55" viewBox="0 0 18 55"><rect x="5" y="3" width="8" height="35" rx="4" fill="none" stroke-width="1.5" class="geo-stroke" /><circle cx="9" cy="44" r="7" fill="none" stroke-width="1.5" class="geo-stroke" /></svg>
      </div>

      <div
        class="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 px-6 md:px-12 lg:px-16 py-16 md:py-20 lg:py-24"
      >
        <!-- Left: Video -->
        <div ref="heroVideo" class="w-full lg:w-1/2 flex-shrink-0">
          <div
            class="hero-video-wrap relative group rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 hover:scale-[1.01]"
          >
            <video
              class="w-full aspect-video object-cover"
              controls
              preload="metadata"
            >
              <source src="https://objectstorage.us-phoenix-1.oraclecloud.com/n/axpi82sarvzj/b/bucket-20260308-1833/o/home-intro.mp4#t=0.5" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        <!-- Right: Text -->
        <div ref="heroText" class="w-full lg:w-1/2 flex flex-col gap-5">
          <h2
            class="hero-line hero-heading text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-tight"
          >
            If you are
          </h2>
          <ul class="flex flex-col gap-3">
            <li class="hero-line hero-body flex items-start gap-3 text-lg md:text-xl leading-relaxed">
              A U.S. medical student
            </li>
            <li class="hero-line hero-body flex items-start gap-3 text-lg md:text-xl leading-relaxed">
              An international medical student or graduate (Caribbean or other)
            </li>
            <li class="hero-line hero-body flex items-start gap-3 text-lg md:text-xl leading-relaxed">
              Planning to take USMLE Step 1 in the next 3-6 months
            </li>
          </ul>
          <p class="hero-line hero-muted text-lg md:text-xl leading-relaxed italic w-fit px-2 rounded hero-highlight-bg">
            ... and you feel like you're studying hard but not improving
          </p>
          <p class="hero-line hero-heading text-2xl md:text-3xl font-bold tracking-tight">
             then watch this!
          </p>
          <div class="hero-cta pt-2 w-full flex">
            <UiButton
              @click="handleGoClick"
              class="hero-btn cursor-pointer min-h-12 px-6 rounded-xl font-semibold text-lg shadow-lg transition-all duration-300"
            >
              Get Started
            </UiButton>
          </div>
        </div>
      </div>
    </section>
    <HomeVideos />
    <section id="pricing" class="rounded-2xl overflow-hidden"></section>
    <HomeTestimonials class="mb-30" />
  </div>
</template>

<style scoped>
/* ===== DARK MODE (default for hero) ===== */
.dark .hero-section {
  background: #1e1e24;
}
.dark .geo-stroke { stroke: rgba(255, 255, 255, 0.10); }
.dark .geo-fill { fill: rgba(255, 255, 255, 0.08); }
.dark .hero-heading { color: #ffffff; }
.dark .hero-body { color: rgba(255, 255, 255, 0.82); }
.dark .hero-muted { color: rgba(255, 255, 255, 1); }
.dark .hero-highlight-bg { background: #000000 }
.dark .hero-video-wrap { ring: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
.dark .hero-btn {
  background: #ffffff;
  color: #1e1e24;
  box-shadow: 0 10px 20px rgba(255,255,255,0.08);
}
.dark .hero-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 25px rgba(255,255,255,0.15);
}

/* ===== LIGHT MODE ===== */
:root:not(.dark) .hero-section,
.hero-section {
  background: #eaecf0;
}
.geo-stroke { stroke: rgba(0, 0, 0, 0.10); }
.geo-fill { fill: rgba(0, 0, 0, 0.08); }
.hero-heading { color: #1a1a2e; }
.hero-body { color: rgba(26, 26, 46, 0.78); }
.hero-muted { color: rgb(0, 0, 0); }
.hero-highlight-bg { background: rgba(255, 255, 255, 0.8); box-shadow: 1px 3px 1px rgba(0,0,0, 1); }
.hero-video-wrap { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); }
.hero-btn {
  background: #1a1a2e;
  color: #f0f1f5;
  box-shadow: 0 10px 20px rgba(0,0,0,0.12);
}
.hero-btn:hover {
  background: #2a2a3e;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
</style>
