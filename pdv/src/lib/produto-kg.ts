export function produtoEhKg(produto: {
	unidademedida?: string | null;
}): boolean {
	const u = (produto.unidademedida ?? "").trim().toLowerCase();
	if (!u) return false;
	return (
		u === "kg" ||
		u === "kgs" ||
		u === "kilo" ||
		u === "kilos" ||
		u === "kilograma" ||
		u === "quilograma" ||
		u === "quilogramas"
	);
}

export function kgDeDigitos(digitos: string): number {
	const n = Number(digitos || "0") / 1000;
	if (!Number.isFinite(n) || n <= 0) return 0;
	return Math.round(n * 1000) / 1000;
}

export function digitosDeKg(kg: number): string {
	if (!Number.isFinite(kg) || kg <= 0) return "0";
	return String(Math.round(kg * 1000));
}

export function formatarKg(kg: number): string {
	return kg.toLocaleString("pt-BR", {
		minimumFractionDigits: 3,
		maximumFractionDigits: 3,
	});
}

export function formatarQuantidade(qtd: number): string {
	if (!Number.isFinite(qtd)) return "0";
	const arred = Math.round(qtd * 1000) / 1000;
	if (Number.isInteger(arred)) return String(arred);
	return formatarKg(arred);
}

export function devePedirPeso(
	produto: { unidademedida?: string | null },
	balancaHabilitada: boolean,
): boolean {
	return balancaHabilitada && produtoEhKg(produto);
}
