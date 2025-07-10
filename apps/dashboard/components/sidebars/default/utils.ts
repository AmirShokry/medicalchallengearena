type ComponentProps<T> = T extends new (...angs: any) => { $props: infer P }
	? NonNullable<P>
	: T extends (props: infer P, ...args: any) => any
		? P
		: {};

const Contents = {
	ContentDefault: defineAsyncComponent(() => import("./ContentDefault.vue")),
	ContentEntry: defineAsyncComponent(() => import("./ContentEntry.vue")),
};
export const activeContentName = ref<keyof typeof Contents>("ContentDefault");
export const activeContentComponent = computed(
	() => Contents[activeContentName.value]
);

export function setActiveContent<T extends keyof typeof Contents>(
	content: T,
	props?: ComponentProps<(typeof Contents)[T]>
) {
	activeContentName.value = content;
	if (props)
		Contents[activeContentName.value] = h(Contents[content], props) as any;
}
