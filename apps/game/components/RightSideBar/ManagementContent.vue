<script setup lang="ts">
const model = defineModel<{
	outgoing: Array<{
		avatarUrl: string;
		username: string;
	}>;
	incoming: Array<{
		avatarUrl: string;
		username: string;
	}>;
}>({ required: true });
const addedFriend = ref("");

function handleAddFriend() {
	if (!addedFriend.value.trim()) return;
	const newFriend = {
		avatarUrl: `https://robohash.org/${addedFriend.value}`,
		username: addedFriend.value,
	};
	model.value.outgoing.push(newFriend);
	addedFriend.value = "";
}
</script>

<template>
	<div class="mt-10 px-2 h-full">
		<div class="px-4 flex flex-col gap-2">
			<UiLabel> Add friend </UiLabel>
			<UiInput v-model="addedFriend"></UiInput>
			<UiButton variant="secondary" @click="handleAddFriend"
				>Send</UiButton
			>
		</div>
		<UiSeparator class="my-6" />
		<div class="px-4">
			<UiLabel> Friend Requests </UiLabel>
		</div>
		<ul class="mt-4 overflow-y-auto">
			<li
				v-for="friend in model.incoming"
				:key="friend.username"
				class="flex items-center p-2 gap-2 hover:bg-muted cursor-pointer">
				<UiAvatar class="border border-border h-8 w-8">
					<UiAvatarImage :src="friend.avatarUrl" alt="Avatar" />
				</UiAvatar>
				<div>
					<p class="text-sm">{{ friend.username }}</p>
					<p class="text-xs text-muted-foreground">
						Incoming Request
					</p>
				</div>
			</li>
			<li><UiSeparator class="my-2" /></li>
			<li
				v-for="friend in model.outgoing"
				:key="friend.username"
				class="flex items-center p-2 gap-2 hover:bg-muted cursor-pointer">
				<UiAvatar class="border border-border h-8 w-8">
					<UiAvatarImage :src="friend.avatarUrl" alt="Avatar" />
				</UiAvatar>
				<div>
					<p class="text-sm">{{ friend.username }}</p>
					<p class="text-xs text-muted-foreground">
						Outgoing Request
					</p>
				</div>
			</li>

			<li
				v-if="
					model.incoming.length === 0 && model.outgoing.length === 0
				"
				class="text-muted-foreground text-sm text-center">
				<p>No incoming requests.</p>
			</li>
			<li
				v-if="model.outgoing.length === 0"
				class="text-muted-foreground text-sm text-center">
				No outgoing requests.
			</li>
		</ul>
	</div>
</template>
