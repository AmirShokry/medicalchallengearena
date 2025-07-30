import cloneDeep from "lodash.clonedeep";

type ResettableObject<T> = T & { ["~reset"](): void } & {
	["~set"](data: T): void;
};

export function ResettableObject<T extends Object>(
	initialState: T
): ResettableObject<T> {
	const defaults = cloneDeep({ ...initialState });
	const currentState = {
		...cloneDeep(initialState),
		["~set"](data: T) {
			Object.assign(this, cloneDeep(data));
		},
		["~reset"]() {
			Object.assign(this, cloneDeep(defaults));
		},
	};
	return currentState;
}
