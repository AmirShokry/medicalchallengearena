export default function createInjection<T>(key: string) {
	return Symbol(key) as InjectionKey<T>;
}
