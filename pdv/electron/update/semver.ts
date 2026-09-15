/** Comparação semver simples x.y.z (sem pré-release). */
export function parseSemver(version: string): [number, number, number] | null {
	const m = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!m) return null;
	return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Retorna -1 se a < b, 0 se iguais, 1 se a > b. Null se inválido. */
export function compareSemver(a: string, b: string): number | null {
	const pa = parseSemver(a);
	const pb = parseSemver(b);
	if (!pa || !pb) return null;
	for (let i = 0; i < 3; i++) {
		if (pa[i] < pb[i]) return -1;
		if (pa[i] > pb[i]) return 1;
	}
	return 0;
}

export function versaoRemotaMaior(local: string, remoto: string): boolean {
	const cmp = compareSemver(local, remoto);
	return cmp !== null && cmp < 0;
}
