export function removerUndefined<T extends Record<string, unknown>>(
	obj: T,
) {
	const entries = Object.entries(obj).filter(([, value]) => value !== undefined);

	return Object.fromEntries(entries) as {
		[K in keyof T]?: Exclude<T[K], undefined>;
	};
}

