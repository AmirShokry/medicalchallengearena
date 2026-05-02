<!--
  /game/solo/story
  ================
  Lists every story-mode system available. Each card links into the
  corresponding system's chapter map at /game/solo/story/<system-name>.
  Today there is exactly one system ("innate-immunity-story") but the
  list is fetched from the backend so adding new systems is a JSON-only
  change.
-->
<script setup lang="ts">
import { BookOpenIcon, ChevronRightIcon } from "lucide-vue-next";

// Story-mode pages opt out of the lobby chrome (left/right shadcn
// sidebars + header). They render their own dedicated chrome — the
// "Your Journey" and "All stations" sidebars matching the original
// reference design — so we use the blank layout to avoid duplicate UI.
definePageMeta({
	layout: "lobby",
});

useSeoMeta({
	title: "MCA | Story Mode",
	description:
		"Pick a system and walk through it station by station — questions, diagrams, and step-by-step concept reviews.",
});

const { $trpc } = useNuxtApp();
const router = useRouter();

const { data: systems, pending } = await useAsyncData("storymode-systems", () =>
	$trpc.storymode.systems.query(),
);

function selectSystem(name: string) {
	router.push(`/game/story/solo/${name}`);
}
</script>

<template>
	<div class="min-h-screen bg-[#0a0e1a] text-[#e8ecf3]">
		<header class="px-6 pt-10 pb-6 md:px-12">
			<div class="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.4em] text-[#e8a951]">
				Story Mode
			</div>
			<h1
				class="font-fraunces text-3xl font-light leading-tight tracking-tight md:text-[34px]"
			>
				Pick a <em class="italic font-normal text-[#e8a951]">system</em>
			</h1>
			<p
				class="mt-2 max-w-[600px] font-fraunces text-base italic leading-relaxed text-[#6b7689]"
			>
				Each system is a guided narrative — chapters of stations that build a
				concept one step at a time, then test it with a question.
			</p>
		</header>

		<!-- Loading skeleton -->
		<div v-if="pending" class="px-6 md:px-12">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div
					v-for="i in 3"
					:key="i"
					class="h-[180px] animate-pulse rounded-2xl border border-[#222c3e] bg-[#111826]"
				/>
			</div>
		</div>

		<!-- Empty state -->
		<div
			v-else-if="!systems || systems.length === 0"
			class="px-6 py-20 text-center text-[#6b7689] md:px-12"
		>
			No story-mode systems are available yet. Check back soon.
		</div>

		<!-- Systems grid -->
		<div v-else class="px-6 pb-16 md:px-12">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<button
					v-for="system in systems"
					:key="system.name"
					class="group relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-[#222c3e] bg-[#111826] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#e8a951] hover:[box-shadow:0_8px_28px_rgba(232,169,81,0.15)]"
					@click="selectSystem(system.name)"
				>
					<!-- Top accent bar -->
					<span
						class="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#e8a951_0%,#d14859_50%,#9370b9_100%)] opacity-85"
					/>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e8a951]/40 bg-[#e8a951]/10 text-[#e8a951]"
						>
							<BookOpenIcon class="h-5 w-5" />
						</div>
						<div class="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-[#e8a951]">
							{{ system.chapterCount }} chapter{{ system.chapterCount === 1 ? "" : "s" }}
						</div>
					</div>
					<div class="flex-1">
						<div
							class="mb-1 font-fraunces text-xl font-medium leading-tight text-[#e8ecf3]"
						>
							{{ system.displayName }}
						</div>
						<div class="font-fraunces text-sm italic text-[#6b7689]">
							{{ system.title }}
						</div>
					</div>
					<div
						class="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-[#b4becf]"
					>
						<span>{{ system.stationCount }} stations</span>
						<span class="flex items-center gap-1 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#e8a951]">
							Open <ChevronRightIcon class="h-3.5 w-3.5" />
						</span>
					</div>
				</button>
			</div>
		</div>
	</div>
</template>
