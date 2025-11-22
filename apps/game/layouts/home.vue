<script setup lang="ts">
import { Switch } from "~/components/ui/switch";
import { LucideMoon, LucideSun, MenuIcon, MonitorIcon } from "lucide-vue-next";
import { useColorMode } from "@vueuse/core";
const header = useTemplateRef("header");
window.addEventListener("scroll", () => {
  if (!header.value) return;
  if (window.scrollY > 0) return header.value.classList.add("header-scrolled");
  return header.value.classList.remove("header-scrolled");
});

const colorMode = useColorMode();
const { state } = colorMode;
function toggleColorMode() {
  colorMode.value = state.value === "dark" ? "light" : "dark";
  colorMode.store.value = state.value;
  darkModeOn.value = state.value === "dark";
}
const darkModeOn = ref(state.value === "dark");
const isAutoMode = ref(colorMode.store.value === "auto");

function onChangeColorMode() {
  if (isAutoMode.value) colorMode.value = "auto";
  else colorMode.value = darkModeOn.value ? "dark" : "light";
}
const canChangeColorMode = computed(() => colorMode.store.value !== "auto");
// console.log("canChangeColorMode", canChangeColorMode.value);
const links = {
  about: "/about",
  contact: "/contact",
  terms: "/terms",
  privacy: "/privacy",
  courses: "/courses",
  ranks: "/ranks",
  login: "/login",
  register: "/register",
};

const { status, signOut } = useAuth();
</script>
<template>
  <div class="min-h-svh relative flex flex-col">
    <header class="fixed h-16 top-4 w-full px-[5svw] z-50 overflow-visible">
      <div
        ref="header"
        class="flex w-full h-full justify-between items-center rounded-2xl px-4 bg-background"
      >
        <Logo />
        <nav class="h-full flex items-center max-md:hidden">
          <ul
            class="h-full flex justify-center items-center pb-1 gap-4 font-geist text-lg"
          >
            <li class="hover:bg-muted px-1 rounded-sm">
              <NuxtLink :to="links.courses" class="cursor-pointer w-full h-full"
                >Courses
              </NuxtLink>
            </li>
            <li class="hover:bg-muted px-1 rounded-sm">
              <NuxtLink class="cursor-pointer w-full h-full" :to="links.ranks">
                Ranks
              </NuxtLink>
            </li>
            <li class="hover:bg-muted px-1 rounded-sm">
              <NuxtLink class="cursor-pointer" :href="links.about">
                About
              </NuxtLink>
            </li>
            <li class="hover:bg-muted px-1 rounded-sm">
              <NuxtLink
                class="cursor-pointer text-lg"
                :to="{ path: '/', hash: '#pricing' }"
              >
                Pricing
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <a
          class="cursor-pointer text-lg"
          :href="links.register"
          v-if="status !== 'authenticated'"
        >
          <UiButton
            class="cursor-pointer min-h-12 bg-primary px-4 rounded-xl text-background font-semibold max-md:hidden"
          >
            Register
          </UiButton>
        </a>
        <UiButton
          v-if="status === 'authenticated'"
          @click="signOut"
          class="cursor-pointer min-h-12 bg-primary px-4 rounded-xl text-background font-semibold max-md:hidden"
        >
          Sign out
        </UiButton>

        <UiDropdownMenu>
          <UiDropdownMenuTrigger class="max-md:flex hidden">
            <MenuIcon class="w-8 h-8 text-primary" />
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent class="w-48 mx-4">
            <UiDropdownMenuItem>
              <NuxtLink
                :to="links.courses"
                class="cursor-pointer w-full h-full text-lg"
                >Courses
              </NuxtLink>
            </UiDropdownMenuItem>
            <UiDropdownMenuItem>
              <NuxtLink
                class="cursor-pointer w-full h-full text-lg"
                :to="links.ranks"
              >
                Ranks
              </NuxtLink>
            </UiDropdownMenuItem>
            <UiDropdownMenuItem>
              <a class="cursor-pointer text-lg w-full" :href="links.about">
                About
              </a>
            </UiDropdownMenuItem>
            <UiDropdownMenuItem tabindex="-1">
              <NuxtLink
                class="cursor-pointer text-lg w-full"
                :to="{ path: '/', hash: '#pricing' }"
              >
                Pricing
              </NuxtLink>
            </UiDropdownMenuItem>
            <UiDropdownMenuItem v-if="status !== 'authenticated'">
              <a class="cursor-pointer text-lg w-full" :href="links.register">
                Register
              </a>
            </UiDropdownMenuItem>
            <UiDropdownMenuItem v-if="status !== 'authenticated'">
              <a class="cursor-pointer text-lg w-full" :href="links.login">
                Login
              </a>
            </UiDropdownMenuItem>
            <UiDropdownMenuItem v-if="status === 'authenticated'">
              <a @click="() => signOut()" class="cursor-pointer text-lg w-full">
                Sign out
              </a>
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </div>
    </header>

    <main class="flex-1 pt-[16svh]">
      <slot />
    </main>
    <footer class="pt-6 pb-12 px-[min(6rem,6svw)] min-h-80">
      <div class="w-full min-h-80 flex max-lg:flex-col gap-4">
        <div class="flex-1 max-lg:order-3 order-1 font-geist flex flex-col">
          <p class="text-xl truncate w-90">yassin@medicalchallengearena.com</p>
          <div class="flex gap-2 items-center">
            <a href="https://discord.com/invite/nBj3EUJR" target="_blank">
              <SvgoDiscord class="text-xl shrink-0" />
            </a>
            <a
              href="https://www.instagram.com/medicalchallengearena/"
              target="_blank"
            >
              <SvgoInstagram class="text-2xl shrink-0" />
            </a>
            <a href="https://www.youtube.com/@yassinbadr6564" target="_blank">
              <SvgoYoutube class="text-2xl shrink-0" />
            </a>
          </div>
          <p class="text-muted-foreground mt-auto">
            © 2025 MEDICALCHALLENGEARENA - v2
          </p>
        </div>
        <div
          class="flex-2 max-lg:order-1 order-2 grid grid-cols-4 max-sm:grid-cols-2 font-geist"
        >
          <div>
            <p class="font-semibold mb-1">Product</p>
            <NuxtLink :to="{ path: '/', hash: '#pricing' }"> Pricing </NuxtLink>
            <p>Features</p>
            <a href="https://status.medicalchallengearena.com/" target="_blank">
              Status
            </a>
            <p>Discounts</p>
          </div>
          <div>
            <p class="font-semibold mb-1">Company</p>
            <NuxtLink :to="links.about">About</NuxtLink>
            <NuxtLink class="block" :to="links.contact"> Contact </NuxtLink>
          </div>
          <div>
            <p class="font-semibold mb-1">Resources</p>
            <p class="truncate">Feedback</p>
            <p class="truncate">Changelog</p>
          </div>
          <div>
            <p class="font-semibold mb-1">Legal</p>
            <NuxtLink class="truncate" :to="links.terms"> Terms </NuxtLink>
            <NuxtLink class="truncate block" :to="links.privacy">
              Privacy
            </NuxtLink>
            <p class="truncate">Acknowledgements</p>
          </div>
        </div>
        <div class="flex-1 order-3 max-lg:order-2 flex flex-col gap-2">
          <div class="flex gap-1 items-center">
            <SvgoGlobe />
            <select class="w-full mb-1">
              <option class="bg-primary-foreground" value="en">English</option>
              <option class="bg-primary-foreground" value="fr">Français</option>
              <option class="bg-primary-foreground" value="es">Español</option>
              <option class="bg-primary-foreground" value="de">Deutsch</option>
              <option class="bg-primary-foreground" value="ar">العربية</option>
              <option class="bg-primary-foreground" value="zh">中文</option>
            </select>
          </div>
          <div class="flex gap-2 items-center">
            <p class="text-muted-foreground mb-1">
              Switch to
              {{ darkModeOn ? "light mode" : "dark mode" }}
            </p>
            <Switch
              :disabled="!canChangeColorMode"
              :model-value="darkModeOn"
              @update:model-value="toggleColorMode"
              class="cursor-pointer"
            >
              <template #thumb>
                <LucideMoon v-if="state === 'dark'" class="size-4" />
                <LucideSun v-else class="size-4" />
              </template>
            </Switch>
            <UiToggle
              v-model="isAutoMode"
              @update:model-value="onChangeColorMode"
              title="system"
              ><MonitorIcon
            /></UiToggle>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.header-scrolled {
  border: 1px solid var(--border);
}
</style>
