<script setup lang="ts">
const props = defineProps<{
	statusIndicies?: boolean[];
	length?: number;
	hideNext?: boolean;
	hidePrev?: boolean;
	orientation?: "horizontal" | "vertical";
}>();
const model = defineModel<number>({ required: true, type: Number, default: 1 });
const totalVisible = defineModel<number>("totalVisible", {
	required: false,
	type: Number,
	default: 5,
});
const totalVisibleDefault = totalVisible.value;
function getItemClass(index: string, isActive?: boolean) {
	if (index === "...") return "v-btn--disabled";
	if (!props.statusIndicies) return "";
	const onActiveClass = isActive ? " tw:[box-shadow:_0px_0px_4px_-1px_white] " : "";
	return props.statusIndicies[Number(index) - 1]
		? `${onActiveClass} tw:!bg-green-900`
		: `${onActiveClass}  tw:!bg-red-900`;
}
function handlePageChange(page: string) {
	if (typeof Number(page) !== "number") return;
	model.value = Number(page);
}

const windowWidth = ref(window.innerWidth);
function handleResize() {
	windowWidth.value = window.innerWidth;
	if (windowWidth.value < 500) totalVisible.value = 2;
	else totalVisible.value = totalVisibleDefault;
}
onMounted(() => window.addEventListener("resize", handleResize));
onUnmounted(() => window.removeEventListener("resize", handleResize));
</script>

<template>
	<v-pagination
		v-model="model"
		:length="length"
		:total-visible="totalVisible"
		rounded
		:class="orientation ? 'vertical-navbar' : 'horizontal-navbar'"
		size="small">
		<template v-if="hideNext" #next> </template>
		<template v-if="hidePrev" #prev> </template>
		<template #item="{ page, isActive }">
			<button
				type="button"
				@click="handlePageChange(page)"
				:disabled="page === '...'"
				:class="getItemClass(page, isActive)"
				class="v-btn v-btn--icon v-theme--dark v-btn--density-default v-btn--rounded v-btn--size-small"
				ellipsis="false"
				:aria-current="isActive"
				:aria-label="`Page ${page}, Current page`">
				<span class="v-btn__overlay"></span>
				<span class="v-btn__underlay"></span>
				<span class="v-btn__content" data-no-activator="">{{ page }}</span>
			</button>
		</template>
	</v-pagination>
</template>

<style scoped>
:global(.vertical-navbar .v-pagination__list) {
	display: flex;
	flex-direction: column;
}
</style>
