import { type Directive } from "vue";
export const vConfirmClick: Directive<
	HTMLElement,
	{
		handler: (...args: any[]) => any;
		message: string;
	}
> = {
	mounted(el, binding) {
		el.addEventListener(
			"click",
			async (event: MouseEvent) => {
				event.preventDefault();
				event.stopImmediatePropagation();
				if (!binding.value.handler)
					return console.warn(
						"No handler provided for v-confirm-click directive"
					);
				const message = binding.value.message || "Are you sure?";
				if (confirm(message)) return await binding.value.handler();
			},
			{ capture: true }
		);
	},
};
