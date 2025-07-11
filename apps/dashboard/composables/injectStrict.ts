type NonEmptyArray<T> = [T, ...T[]];
type NonEmptyInjectionKey<T> = NonEmptyArray<InjectionKey<T>>;
/**
 *
 * @param key - A single injection key or an array of injection keys.
 * @returns The injected value(s) corresponding to the provided key(s).
 * @throws If the key is not found, an error is thrown.
 * @example
 * // Injection keys created somewhere in the app
 * const barKey = createInjection<string>("barKey");
 * const fooKey = createInjection<boolean>("fooKey");
 * // Parent component provides the values
 * provide(barKey, "barValue");
 * provide(fooKey, true);
 * // Child component injects the values
 * const barValue  = injectStrict(barKey); // type is string
 * const fooValue = injectStrict([y]); // type is boolean
 */
export default function injectStrict<T>(key: InjectionKey<T>): T;
export default function injectStrict<T extends NonEmptyInjectionKey<T>>(
	key: [...T]
): {
	[I in keyof T]: T[I] extends InjectionKey<infer U> ? U : never;
};
export default function injectStrict(key: any) {
	if (Array.isArray(key)) {
		const values = key.map((k) => inject(k)!);
		if (values.some((value) => value === undefined))
			throw new Error(
				`One or more injection keys not found: ${key.map((k) => String(k)).join(", ")}`
			);

		return values;
	} else {
		const value = inject(key);
		if (!value) throw new Error(`Injection key "${String(key)}" not found`);
		return value;
	}
}
