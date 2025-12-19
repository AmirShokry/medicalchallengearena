<script setup lang="ts">
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const videos = [
  {
    title: "Intro Video",
    description:
      "Get a quick overview of what Medical Challenge Arena is all about. See how our platform combines gamification with rigorous medical education to help you master your exams.",
    src: "https://player.vimeo.com/video/1132980938",
  },
  {
    title: "Understanding your ADHD brain — Study partnership program",
    description:
      "Discover our specialized study partnership program tailored for students with ADHD. Learn strategies and tools designed to work with your unique learning style for maximum retention and success.",
    src: "https://player.vimeo.com/video/1132982241",
  },
  {
    title: "Program Description",
    description:
      "Dive deep into the Medical Challenge Arena program. Explore the features, competitive modes, and community aspects that make our platform the ultimate tool for USMLE preparation.",
    src: "https://www.youtube.com/embed/22IzN2He1ls",
  },
];

const sectionRefs = ref<HTMLElement[]>([]);
const headerRef = ref<HTMLElement | null>(null);

const setSectionRef = (el: any, index: number) => {
  if (el) {
    sectionRefs.value[index] = el as HTMLElement;
  }
};

onMounted(() => {
  // Animate Header
  if (headerRef.value) {
    gsap.fromTo(
      headerRef.value.children,
      {
        y: 50,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: headerRef.value,
          start: "top 80%",
        },
      }
    );
  }

  // Animate Sections
  sectionRefs.value.forEach((section, index) => {
    const videoSide = section.querySelector(".video-side");
    const textSide = section.querySelector(".text-side");
    const isEven = index % 2 === 0;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 75%",
        end: "bottom 20%",
        toggleActions: "play none none reverse",
      },
    });

    tl.fromTo(
      videoSide,
      {
        x: isEven ? -100 : 100,
        opacity: 0,
      },
      {
        x: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power3.out",
      }
    ).fromTo(
      textSide,
      {
        x: isEven ? 100 : -100,
        opacity: 0,
      },
      {
        x: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power3.out",
      },
      "-=1" // Overlap animations
    );
  });
});
</script>

<template>
  <div class="flex flex-col mb-32 px-6 py-20 font-geist overflow-hidden">
    <div ref="headerRef" class="max-w-5xl mx-auto text-center space-y-6">
      <h2
        class="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 pb-2"
      >
        Discover Our Program
      </h2>
      <p
        class="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
      >
        Explore how Medical Challenge Arena transforms USMLE education through
        gamification and community.
      </p>
    </div>

    <section
      v-for="(video, index) in videos"
      :key="index"
      :ref="(el) => setSectionRef(el, index)"
      class="max-w-7xl mx-auto w-full min-h-[60vh] flex items-center justify-center"
    >
      <div
        class="flex flex-col gap-12 lg:gap-24 items-center w-full"
        :class="[index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse']"
      >
        <!-- Video Side -->
        <div class="w-full lg:w-1/2 group perspective-1000 video-side">
          <div
            class="relative w-full aspect-video rounded-3xl overflow-hidden bg-muted shadow-2xl border border-border/50 ring-1 ring-border/50 transition-transform duration-500 group-hover:scale-[1.02] group-hover:shadow-primary/10"
          >
            <iframe
              :src="video.src"
              class="absolute top-0 left-0 w-full h-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
          </div>
        </div>

        <!-- Text Side -->
        <div class="w-full lg:w-1/2 flex flex-col gap-8 text-side">
          <div
            class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary font-bold text-2xl mb-2 shadow-sm"
          >
            {{ index + 1 }}
          </div>
          <h3
            class="text-3xl md:text-5xl font-bold leading-tight text-foreground"
          >
            {{ video.title }}
          </h3>
          <p class="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {{ video.description }}
          </p>
          <div class="pt-4">
            <div
              class="h-1 w-24 bg-gradient-to-r from-primary to-transparent rounded-full"
            ></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
