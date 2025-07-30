<script setup lang="ts">
const testimonials = [
	{
		id: 1,
		name: "Mark",
		role: "Student",
		avatar: "https://i.imghippo.com/files/OLaN8478bw.PNG",
		originalUrl:
			"https://payhip.com/cdn-cgi/image/format=auto/https://pe56d.s3.amazonaws.com/o_1iertr3i61l5a1ekf134gg091a0kl.jpg",
		text: "MedicalChallengeArena has truly been a game-changer in my NBME preparation journey. I feel more confident with each practice session, and I clearly achieved some progress toward my target NBME score. I'm genuinely grateful for this resource.",
		rating: 5,
	},
	{
		id: 2,
		name: "Abali",
		role: "Student",
		originalUrl:
			"https://payhip.com/cdn-cgi/image/format=auto/https://pe56d.s3.amazonaws.com/o_1iertr3i681fkh2jso1njueinm.jpg",
		avatar: "https://i.imghippo.com/files/XiCc1460d.PNG",
		text: "Thanks to MedicalChallengeArena, I reached my target Step 1. Looking forward for Step 2 integration ",
		rating: 5,
	},
	{
		id: 3,
		name: "Brandon",
		role: "Student",
		originalUrl:
			"https://payhip.com/cdn-cgi/image/format=auto/https://pe56d.s3.amazonaws.com/o_1iertr3i6c2jfr41pr2ouj1776q.png",
		avatar: "https://i.imghippo.com/files/Grj8170sLM.png",
		text: "I can't thank MCA enough for helping me reach my target NBME score. After struggling with inconsistent results and feeling overwhelmed, this platform gave me exactly what I needed—focused practice, high-yield questions, and clear explanations that actually stick. The multiplayer  kept me motivated, and each session brought me closer to my goal. Truly grateful!",
		rating: 5,
	},
	{
		id: 4,
		name: "David",
		role: "Student",
		avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
		text: "Reaching my target NBME score felt like a distant dream—until I found MedicalChallengeArena. The platform's focused questions and detailed explanations were exactly what I needed. I stayed consistent, tracked my progress, and finally hit my goal. I’m incredibly thankful for the support and structure this platform provided!",
		rating: 5,
	},
	{
		id: 5,
		name: "Lisa",
		role: "Student",
		avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop&crop=face",
		text: "MedicalChallengeArena was the key to my NBME success. The question bank was spot-on, and the explanations helped me truly understand my mistakes. After weeks of focused practice, I finally reached my target score. I’m so thankful for this platform—it made all the difference!",
		rating: 4,
	},
];
</script>
<template>
	<article class="wrapper flex flex-col gap-(--testimonial-gap) max-w-screen">
		<div class="marquee">
			<div class="marquee__group">
				<a
					v-for="testimonial in testimonials"
					:href="testimonial.originalUrl"
					target="_blank"
					rel="noopener noreferrer"
					class="cusror-pointer flex flex-col w-(--testimonial-size) h-full bg-primary-foreground min-h-[min(10rem+50vh,30rem)] p-[calc(var(--testimonial-size)/10)] rounded-[0.5rem]">
					<div class="text-primary mb-4">
						<svg
							class="w-8 h-8"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24">
							<path
								stroke-width="2"
								d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
							<path
								stroke-width="2"
								d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
						</svg>
					</div>

					<p
						class="text-base leading-relaxed mb-6 flex-grow hyphens-auto break-all">
						{{ testimonial.text }}
					</p>
					<div class="flex items-center gap-4 mb-4 flex-grow">
						<img
							:src="testimonial.avatar"
							:alt="testimonial.name"
							class="w-12 h-12 rounded-full object-cover cursor-pointer" />
						<div class="flex-1 cursor-pointer">
							<h4 class="font-semibold">
								{{ testimonial.name }}
							</h4>
							<p class="text-sm">
								{{ testimonial.role }}
							</p>
						</div>
					</div>

					<div class="flex gap-1">
						<span
							v-for="i in 5"
							:key="i"
							class="text-lg transition-colors duration-200"
							:class="
								i <= testimonial.rating
									? 'text-yellow-400'
									: 'text-gray-300'
							">
							★
						</span>
					</div>
				</a>
			</div>

			<div aria-hidden="true" class="marquee__group">
				<a
					v-for="testimonial in testimonials"
					:href="testimonial.originalUrl"
					target="_blank"
					class="cusror-pointer min-h-[min(10rem+50vh,30rem)] bg-primary-foreground h-full flex flex-col w-(--testimonial-size) p-[calc(var(--testimonial-size)/10)] rounded-[0.5rem]">
					<div class="text-primary mb-4">
						<svg
							class="w-8 h-8"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24">
							<path
								stroke-width="2"
								d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
							<path
								stroke-width="2"
								d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
						</svg>
					</div>

					<p
						class="text-base leading-relaxed mb-6 flex-grow hyphens-auto break-all">
						{{ testimonial.text }}
					</p>

					<div
						class="flex items-center gap-4 mb-4"
						:href="testimonial.originalUrl"
						target="_blank"
						rel="noopener noreferrer">
						<img
							:src="testimonial.avatar"
							:alt="testimonial.name"
							class="w-12 h-12 rounded-full object-cover" />
						<div class="flex-1">
							<h4 class="font-semibold">
								{{ testimonial.name }}
							</h4>
							<p class="text-sm">
								{{ testimonial.role }}
							</p>
						</div>
					</div>

					<div class="flex gap-1">
						<span
							v-for="i in 5"
							:key="i"
							class="text-lg transition-colors duration-200"
							:class="
								i <= testimonial.rating
									? 'text-yellow-400'
									: 'text-gray-300'
							">
							★
						</span>
					</div>
				</a>
			</div>
		</div>
	</article>
</template>
<style>
:root {
	--testimonial-size: clamp(10rem, 1rem + 40vmin, 30rem);
	--testimonial-gap: calc(var(--testimonial-size) / 14);
	--testimonial-duration: 60s;
	--testimonial-scroll-start: 0;
	--testimonial-scroll-end: calc(-100% - var(--testimonial-gap));
}
</style>
<style scoped>
.marquee {
	display: flex;
	overflow: hidden;
	user-select: none;
	gap: var(--testimonial-gap);
	mask-image: linear-gradient(
		var(--mask-direction, to right),
		hsl(0 0% 0% / 0),
		hsl(0 0% 0% / 1) 20%,
		hsl(0 0% 0% / 1) 80%,
		hsl(0 0% 0% / 0)
	);
}

.marquee__group {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-around;
	gap: var(--testimonial-gap);
	min-width: 100%;
	animation: scroll-x var(--testimonial-duration) linear infinite;
}
/**
  
 
@media (prefers-reduced-motion: reduce) {
	.marquee__group {
		animation-play-state: paused;
	}
}
*/
@keyframes scroll-x {
	from {
		transform: translateX(var(--testimonial-scroll-start));
	}

	to {
		transform: translateX(var(--testimonial-scroll-end));
	}
}

@keyframes fade {
	to {
		opacity: 0;
		visibility: hidden;
	}
}
</style>
