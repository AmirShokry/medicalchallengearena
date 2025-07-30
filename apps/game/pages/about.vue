<script lang="ts" setup>
definePageMeta({
  layout: "home",
});
useSeoMeta({
  title: "About",
  description:
    "Learn more about Medical Challenge Arena, our mission, and how we can help you master medicine together.",
});
</script>
<template>
  <div class="px-[12svw] pb-10">
    <section class="min-h-[calc(100svh-15rem)] rounded-2xl overflow-clip mb-12">
      <header class="font-bold text-4xl mb-2">About</header>
      <p class="text-lg">
        Medicalchallengearena is a cutting-edge, multiplayer online question
        bank game designed to revolutionize the way medical students and
        professionals learn, revise, and compete. By blending the rigor of
        medical education with the thrill of gaming, MedBattle Arena offers a
        unique, high-impact study experience.
      </p>

      <header class="font-bold text-4xl mt-12 mb-8">Team</header>
      <div class="flex items-center justify-center">
        <div
          class="bg-primary-foreground w-1/2 max-md:w-full h-full rounded-2xl p-8"
        >
          <div class="flex flex-col items-center justify-center h-full gap-2">
            <div class="rounded-full overflow-clip">
              <img
                src="~/assets/images/yassin4.jpg"
                class="w-32 h-32 object-cover"
              />
            </div>
            <p class="text-2xl font-semibold">Yassin Badr</p>
            <p class="text-lg">CEO</p>
            <p class="px-4">
              With a passion for innovation and a commitment to excellence,
              Yassin leads the team with a vision to revolutionize medical
              education through engaging and effective learning experiences.
            </p>
          </div>
        </div>
      </div>

      <div class="flex justify-between mt-10 gap-10 flex-wrap max-md:flex-col">
        <div
          class="bg-primary-foreground flex-1 rounded-2xl flex flex-col items-center justify-center pt-4 pb-10 text-center"
        >
          <img
            src="~/assets/images/yassin4.jpg"
            class="rounded-full w-14 aspect-square object-cover object-[center_-0.2rem]"
          />
          <p class="text-lg font-bold">Yassin Essam</p>
          <p>COO</p>
        </div>
        <a
          href="https://github.com/AmirShokry"
          target="_blank"
          class="bg-primary-foreground flex-1 rounded-2xl flex flex-col items-center justify-center pt-4 pb-10 text-center"
        >
          <img
            src="https://i.imghippo.com/files/Ktp6193Btc.jpg"
            class="rounded-full w-14 aspect-square object-cover object-[center_-0.2rem]"
          />
          <p class="text-lg font-bold">Amir Shokry</p>
          <p>Software Engineer</p>
        </a>
        <a
          href="https://github.com/reo4"
          target="https://github.com/reo4"
          class="bg-primary-foreground flex-1 rounded-2xl flex flex-col items-center justify-center pt-4 pb-10 text-center"
        >
          <img
            src="https://i.imghippo.com/files/JMJ1697JM.jpg"
            class="rounded-full w-14 aspect-square object-cover"
          />
          <p class="text-lg font-bold">Ahmed Yasser</p>
          <p>Software Engineer</p>
        </a>
      </div>
    </section>
  </div>
</template>
