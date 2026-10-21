import type { CentroCusto } from "@/model/centro-custo-model.js";

export type CentroCustoNoArvore = CentroCusto & {
	filhos: CentroCustoNoArvore[];
};

export function montarArvoreCentrosCusto(
	itens: CentroCusto[],
): CentroCustoNoArvore[] {
	const mapa = new Map<string, CentroCustoNoArvore>();
	for (const item of itens) {
		mapa.set(item.id, { ...item, filhos: [] });
	}
	const raizes: CentroCustoNoArvore[] = [];
	for (const no of mapa.values()) {
		if (no.idcentrocustopai && mapa.has(no.idcentrocustopai)) {
			mapa.get(no.idcentrocustopai)?.filhos.push(no);
		} else {
			raizes.push(no);
		}
	}
	return raizes;
}
