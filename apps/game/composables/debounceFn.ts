type FunctionArgs<Args extends any[] = any[], Return = void> = (
	...args: Args
) => Return;
type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;
type AnyFn = (...args: any[]) => any;
type Promisify<T> = Promise<Awaited<T>>;
type PromisifyFn<T extends AnyFn> = (
	...args: ArgumentsType<T>
) => Promisify<ReturnType<T>>;
interface FunctionWrapperOptions<Args extends any[] = any[], This = any> {
	fn: FunctionArgs<Args, This>;
	args: Args;
	thisArg: This;
}
interface DebounceFilterOptions {
	maxWait?: MaybeRefOrGetter<number>;
	rejectOnCancel?: boolean;
}

type EventFilter<
	Args extends any[] = any[],
	This = any,
	Invoke extends AnyFn = AnyFn,
> = (
	invoke: Invoke,
	options: FunctionWrapperOptions<Args, This>
) => ReturnType<Invoke> | Promisify<ReturnType<Invoke>>;

const noop = () => {};

function createFilterWrapper<T extends AnyFn>(filter: EventFilter, fn: T) {
	function wrapper(this: any, ...args: ArgumentsType<T>) {
		return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
			// make sure it's a promise
			Promise.resolve(
				filter(() => fn.apply(this, args), { fn, thisArg: this, args })
			)
				.then(resolve)
				.catch(reject);
		});
	}

	return wrapper;
}

function toValue<T>(r: MaybeRefOrGetter<T>): T {
	return typeof r === "function" ? (r as AnyFn)() : unref(r);
}

function debounceFilter(
	ms: MaybeRefOrGetter<number>,
	options: DebounceFilterOptions = {}
) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let maxTimer: ReturnType<typeof setTimeout> | undefined | null;
	let lastRejector: AnyFn = noop;

	const _clearTimeout = (timer: ReturnType<typeof setTimeout>) => {
		clearTimeout(timer);
		lastRejector();
		lastRejector = noop;
	};

	const filter: EventFilter = (invoke) => {
		const duration = toValue(ms);
		const maxDuration = toValue(options.maxWait);

		if (timer) _clearTimeout(timer);

		if (duration <= 0 || (maxDuration !== undefined && maxDuration <= 0)) {
			if (maxTimer) {
				_clearTimeout(maxTimer);
				maxTimer = null;
			}
			return Promise.resolve(invoke());
		}

		return new Promise((resolve, reject) => {
			lastRejector = options.rejectOnCancel ? reject : resolve;
			if (maxDuration && !maxTimer) {
				maxTimer = setTimeout(() => {
					if (timer) _clearTimeout(timer);
					maxTimer = null;
					resolve(invoke());
				}, maxDuration);
			}

			timer = setTimeout(() => {
				if (maxTimer) _clearTimeout(maxTimer);
				maxTimer = null;
				resolve(invoke());
			}, duration);
		});
	};

	return filter;
}

/**
 * @overview A composable function that creates a debounced function
 * @see https://vueuse.org/useDebounce
 * @param fn Function to be called when debounce period ends
 * @param ms Debounce period in milliseconds
 * @returns Wrapped function to be called to execute the original function
 * @example
 * ```ts
 * const debounced = useDebounce((value: string) => function(value), 200)
 * debounced('hello');
 * // Only use define useDebounce once, and call the returned function to execute the debounced function
 * ```
 */
export function useDebounce<T extends FunctionArgs>(
	fn: T,
	ms: MaybeRefOrGetter<number> = 200,
	options: DebounceFilterOptions = {}
): PromisifyFn<T> {
	return createFilterWrapper(debounceFilter(ms, options), fn);
}
