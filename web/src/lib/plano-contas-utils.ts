export function extrairSegmentosCodigoPlanoContas(
	codigo: string | null | undefined,
): number[] {
	if (!codigo?.trim()) {
		return [];
	}

	return codigo
		.trim()
		.split(/[.\s]+/)
		.filter(Boolean)
		.map((parte) => Number.parseInt(parte, 10));
}

export function compararCodigoPlanoContas(
	a: string | null | undefined,
	b: string | null | undefined,
): number {
	const vazioA = !a?.trim();
	const vazioB = !b?.trim();

	if (vazioA && vazioB) {
		return (a ?? "").localeCompare(b ?? "");
	}

	if (vazioA) {
		return 1;
	}

	if (vazioB) {
		return -1;
	}

	const codigoA = a;
	const codigoB = b;
	const segmentosA = extrairSegmentosCodigoPlanoContas(codigoA);
	const segmentosB = extrairSegmentosCodigoPlanoContas(codigoB);
	const tamanho = Math.max(segmentosA.length, segmentosB.length);

	for (let indice = 0; indice < tamanho; indice++) {
		const diferenca = (segmentosA[indice] ?? 0) - (segmentosB[indice] ?? 0);
		if (diferenca !== 0) {
			return diferenca;
		}
	}

	return codigoA!.localeCompare(codigoB!);
}

export function ordenarPlanoContasPorCodigo<T extends { codigo: string | null }>(
	itens: T[],
): T[] {
	return [...itens].sort((a, b) =>
		compararCodigoPlanoContas(a.codigo, b.codigo),
	);
}
