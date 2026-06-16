export type AtualizacaoParcial<T> = {
	// Quando a propriedade está presente, deve manter o tipo original.
	// Isso evita conflitos com `exactOptionalPropertyTypes`.
	[K in keyof T]?: T[K];
};
