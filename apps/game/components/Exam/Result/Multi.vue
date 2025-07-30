<script setup lang="ts">
import {
	ChartNoAxesColumnIncreasingIcon,
	HomeIcon,
	RotateCwIcon,
	UserPlusIcon,
} from "lucide-vue-next";
const props = defineProps<{
	totalQuestionsNumber: number;
	user: ReturnType<typeof useGameStore>["players"]["user"];
	opponent: ReturnType<typeof useGameStore>["players"]["opponent"];
}>();
onMounted(() => window.scrollTo(0, 0));

const hasWon = Math.sign(
	props.user.records.stats.totalMedpoints -
		props.opponent.records.stats.totalMedpoints
);

const { user: $$user } = storeToRefs(useUserStore());
const $$game = useGameStore();
const { $trpc } = useNuxtApp();

if (hasWon === 1) {
	if ($$user.value) $$user.value.gamesWon! += 1;
}
const matchResult = computed(() => {
	if (hasWon === 1) return "VICTORY";
	if (hasWon === -1) return "DEFEAT";
	return "DRAW";
});

const canSendFriendRequest = computed(() => {
	if (!$$user.value) return;
	return props.opponent.info.username !== $$user.value.username;
	// !$$user.friendList.some(
	// 	(friend) => friend.username === props.opponent.info.username)
});

async function handleSendFriendRequest() {
	if (!canSendFriendRequest) return;
	// await $trpc.friends.add.mutate(props.opponent.info.username);
}
function getStatusColor() {
	if (matchResult.value === "VICTORY") return "text-green-700";
	if (matchResult.value === "DEFEAT") return "text-red-700";
	return "text-gray-500";
}
onBeforeUnmount(() => $$game["~resetEverything"]());
</script>
<template>
	<div
		class="absolute flex justify-center py-6 w-full items-center min-h-full left-:0 top-0 bg-[#161616]">
		<div class="flex flex-col items-center w-1/2 gap-6">
			<div
				class="flex justify-center items-center gap-10 text-center w-full px-4">
				<div>
					<img
						:src="user.info.avatarUrl!"
						width="100"
						class="aspect-square max-md:hidden rounded-full object-cover" />
					<span class="font-medium">{{ user.info.username }}</span>
				</div>

				<div
					class="flex flex-col justify-center items-center basis-1/3 max-md:basis-full">
					<p class="text-2xl font-medium">Match Result</p>
					<p :class="getStatusColor()" class="text-4xl font-semibold">
						{{ matchResult }}
					</p>
				</div>
				<div>
					<div class="relative">
						<img
							:src="opponent.info.avatarUrl!"
							width="100"
							class="aspect-square max-md:hidden rounded-full object-cover" />
						<UserPlusIcon
							v-if="canSendFriendRequest"
							@click="handleSendFriendRequest"
							title="Send friend request"
							class="!absolute -bottom-1 right-1 hover:scale-105 cursor-pointer" />
					</div>
					<span class="font-medium">{{
						opponent.info.username
					}}</span>
				</div>
			</div>
			<ul class="w-full px-2 flex flex-col gap-4 font-mono">
				<li
					class="bg-slate-200 font-semibold text-black px-4 py-6 rounded-md flex justify-between items-center gap-4 text-center">
					<p>{{ user.records.stats.correctAnswersCount }}</p>
					<p>Correct Answers ({{ totalQuestionsNumber }})</p>
					<p>{{ opponent.records.stats.correctAnswersCount }}</p>
				</li>
				<li
					class="bg-slate-200 font-semibold text-black px-4 py-6 rounded-md flex justify-between items-center gap-4 text-center">
					<p>{{ user.records.stats.wrongAnswersCount }}</p>
					<p>Incorrect Answers</p>
					<p>{{ opponent.records.stats.wrongAnswersCount }}</p>
				</li>
				<li
					class="bg-slate-200 font-semibold text-black px-4 py-6 rounded-md flex justify-between items-center gap-4 text-center">
					<p>{{ user.records.stats.correctEliminationsCount }}</p>
					<p>Correct Eliminations</p>
					<p>{{ opponent.records.stats.correctEliminationsCount }}</p>
				</li>
				<li
					class="bg-slate-200 font-semibold text-black px-4 py-6 rounded-md flex justify-between items-center gap-4 text-center">
					<p>{{ user.records.stats.wrongEliminationsCount }}</p>
					<p>Incorrect Eliminations</p>
					<p>{{ opponent.records.stats.wrongEliminationsCount }}</p>
				</li>
				<li
					class="bg-slate-200 font-semibold text-black px-4 py-6 rounded-md flex justify-between items-center gap-4 text-center">
					<p>{{ user.records.stats.totalMedpoints }}</p>
					<p :class="getStatusColor()">Total Medpoints</p>
					<p>{{ opponent.records.stats.totalMedpoints }}</p>
				</li>
			</ul>
			<div
				class="w-full px-2 flex justify-center gap-4 pb-4 h-full items-center">
				<v-btn
					@click="$router.push({ name: 'game-lobby' })"
					color="#404040"
					title="Back to lobby">
					<HomeIcon />
				</v-btn>
				<v-btn
					disabled
					class="coming-soon"
					color="#404040"
					title="Restart the game - coming soon">
					<RotateCwIcon />
				</v-btn>
				<v-btn
					@click="$router.push({ name: 'ranks' })"
					color="#404040"
					title="Go to leaderboard">
					<ChartNoAxesColumnIncreasingIcon />
				</v-btn>
			</div>
		</div>
	</div>
</template>
