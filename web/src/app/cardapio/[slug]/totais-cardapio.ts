export function resolverTaxaEntregaLocal(params: {
	modalidade: "delivery" | "retirada";
	bairro?: string;
	taxaPadrao: number;
	bairros: Array<{ nome: string; taxa: number }>;
}): number {
	if (params.modalidade !== "delivery") return 0;
	const nome = params.bairro?.trim().toLowerCase();
	if (nome) {
		const encontrado = params.bairros.find(
			(item) => item.nome.trim().toLowerCase() === nome,
		);
		if (encontrado) return Number(encontrado.taxa) || 0;
	}
	return Number(params.taxaPadrao) || 0;
}
