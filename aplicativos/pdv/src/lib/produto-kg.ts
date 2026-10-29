/** Unidade global KG (api/drizzle/0016_unidades_medida_globais.sql). */
export const ID_UNIDADE_KG_SISTEMA =
	"a0000001-0000-4000-8000-000000000002";

const CODIGOS_KG = new Set([
	"kg",
	"kgs",
	"kilo",
	"kilos",
	"kilograma",
	"quilograma",
	"quilogramas",
]);

export type UnidadeProduto = {
	unidademedida?: string | null;
	idunidademedida?: string | null;
};

function normalizarUnidade(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

/** True se o produto usa a unidade de sistema KG / Quilograma. */
export function produtoEhKg(produto: UnidadeProduto): boolean {
	const id = (produto.idunidademedida ?? "").trim().toLowerCase();
	if (id === ID_UNIDADE_KG_SISTEMA) return true;

	const bruto = (produto.unidademedida ?? "").trim();
	if (!bruto) return false;
	if (bruto.toLowerCase() === ID_UNIDADE_KG_SISTEMA) return true;

	return CODIGOS_KG.has(normalizarUnidade(bruto));
}

export function resolverSiglaUnidade(
	produto: UnidadeProduto,
	unidades: Map<string, { codigo?: string | null; nome?: string | null }>,
): string | null {
	const atual = produto.unidademedida?.trim();
	if (atual) return atual;
	const id = produto.idunidademedida?.trim();
	if (!id) return null;
	const unidade = unidades.get(id);
	const codigo = unidade?.codigo?.trim();
	if (codigo) return codigo;
	const nome = unidade?.nome?.trim();
	return nome || null;
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

export function devePedirPeso(produto: UnidadeProduto): boolean {
	return produtoEhKg(produto);
}
