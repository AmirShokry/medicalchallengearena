import { type Directive } from "vue";

type SpecialHTMLElement = HTMLElement & { __binding: boolean };

export default {
	created(el, binding) {
		el.__binding = binding.value;
		overrideEventListner(el);
		if (el.__binding === true) disableElement(el);
	},

	beforeUpdate(el, binding) {
		el.__binding = binding.value;
		if (el.__binding === true) disableElement(el);
	},

	updated(el, binding) {
		el.__binding = binding.value;
		if (el.__binding === false) enableELement(el);
	},
} as Directive<SpecialHTMLElement, boolean>;

function enableELement(el: SpecialHTMLElement) {
	el.style.cursor = "";
	el.style.opacity = "1";
	el.style.pointerEvents = "auto";
	el.removeAttribute("disabled");
	el.querySelectorAll("*").forEach((child) =>
		child.removeAttribute("disabled")
	);
}
function disableElement(el: SpecialHTMLElement, nostyle?: boolean) {
	if (nostyle !== true) el.style.opacity = "0.5";

	el.style.pointerEvents = "none";
	el.setAttribute("disabled", "true");
	el.querySelectorAll("*").forEach((child) =>
		child.setAttribute("disabled", "true")
	);
}

// export const vDisabledRecursive: Directive<SpecialHTMLElement, boolean> = {
// 	created(el, binding) {
// 		el.__binding = binding.value;
// 		overrideEventListner(el);

// 		if (el.__binding) {
// 			el.setAttribute("disabled", "true");
// 			el.querySelectorAll("*").forEach((child) =>
// 				child.setAttribute("disabled", "true")
// 			);
// 		}
// 	},

// 	beforeUpdate(el, binding) {
// 		el.__binding = binding.value;
// 		if (el.__binding === true) {
// 			el.setAttribute("disabled", "true");
// 			el.querySelectorAll("*").forEach((child) =>
// 				child.setAttribute("disabled", "true")
// 			);
// 		}
// 	},

// 	updated(el, binding) {
// 		el.__binding = binding.value;
// 		if (el.__binding === false) {
// 			if (el.hasAttribute("disabled")) el.removeAttribute("disabled");
// 			el.querySelectorAll("*").forEach((child) =>
// 				child.hasAttribute("disabled")
// 					? child.removeAttribute("disabled")
// 					: undefined
// 			);
// 		}
// 	},
// };
function overrideEventListner(el: SpecialHTMLElement) {
	const originalListener = el.addEventListener;

	el.addEventListener = function (
		this: EventTarget,
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions
	) {
		const oldListener = listener;
		if (!oldListener) return;
		listener = function (...args) {
			if (el.__binding) return args?.[0]?.stopImmediatePropagation();

			if (typeof oldListener === "function") return oldListener(...args);
			if (
				typeof oldListener === "object" &&
				typeof oldListener.handleEvent === "function"
			)
				return oldListener.handleEvent(...args);
		};

		if (el.__binding)
			options = Object.assign({}, options, { capture: true });

		return originalListener.call(this, type, listener, options);
	};
	const originalRemoveEventListener = el.removeEventListener;
	el.removeEventListener = function (
		this: EventTarget,
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions
	) {
		if (el.__binding) return;
		return originalRemoveEventListener.call(this, type, listener, options);
	};
	el.addEventListener("click", () => undefined);
}
