import type { ContaMesaItem } from "@/services/conta-mesa-item.service";

export const STATUS_MESA = {
	ABERTO: 1,
	FECHADO: 2,
	FATURADO: 3,
	CANCELADO: 99,
} as const;

export const STATUS_MESA_LABEL: Record<number, string> = {
	1: "Aberta",
	2: "Fechada",
	3: "Faturada",
	99: "Cancelada",
};

const NUMERO_PDV_KEY = "gourmet:numeropdv";

export interface ItemComPreco {
	quantidade: string;
	precounitario: string;
	taxaservico?: number | null;
}

export interface PagamentosFechar {
	valordinheiro?: string;
	valorcartao?: string;
	valorpix?: string;
	valorprepago?: string;
}

export function parseValor(value: string | null | undefined): number {
	if (!value) return 0;
	const parsed = Number.parseFloat(value);
	return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatCurrency(value: string | number | null | undefined): string {
	const num =
		typeof value === "string" ? parseValor(value) : (value ?? 0);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
}

export function calcularSubtotalItens(itens: ItemComPreco[]): number {
	return itens.reduce((acc, item) => {
		const qty = parseValor(item.quantidade);
		const preco = parseValor(item.precounitario);
		return acc + qty * preco;
	}, 0);
}

export function calcularTotalComTaxas(
	subtotal: number,
	desconto = 0,
	taxaServico = 0,
	couvert = 0,
): number {
	return Math.max(0, subtotal - desconto + taxaServico + couvert);
}

export function calcularTotalPago(pagamentos: PagamentosFechar): number {
	return (
		parseValor(pagamentos.valordinheiro) +
		parseValor(pagamentos.valorcartao) +
		parseValor(pagamentos.valorpix) +
		parseValor(pagamentos.valorprepago)
	);
}

export function calcularTroco(total: number, pagamentos: PagamentosFechar): number {
	const pago = calcularTotalPago(pagamentos);
	return Math.max(0, pago - total);
}

export function calcularTotalContaMesaItens(itens: ContaMesaItem[]): number {
	return calcularSubtotalItens(itens);
}

export function getNumeropdv(): number {
	if (typeof window === "undefined") return 1;
	const stored = localStorage.getItem(NUMERO_PDV_KEY);
	if (!stored) return 1;
	const parsed = Number.parseInt(stored, 10);
	return Number.isNaN(parsed) ? 1 : parsed;
}

export function setNumeropdv(numero: number): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(NUMERO_PDV_KEY, String(numero));
}

export function formatQuantidade(value: string | number): string {
	const num = typeof value === "string" ? parseValor(value) : value;
	return num.toFixed(3);
}

export function calcularPrecoTotalItem(
	quantidade: string,
	precounitario: string,
): string {
	const total = parseValor(quantidade) * parseValor(precounitario);
	return total.toFixed(2);
}

export function formatPrecoItem(preco: string | null | undefined): string {
	const num = parseValor(preco);
	return num.toFixed(2);
}

export function buildContaMesaItemFromProduto(params: {
	produto: {
		id: string;
		nome: string;
		preco: string | null;
		idunidademedida: string | null;
	};
	idcontamesa: string;
	idgarcom: string;
	quantidade?: string;
}): {
	idcontamesa: string;
	idproduto: string;
	idgarcom: string;
	nomeproduto: string;
	quantidade: string;
	precounitario: string;
	precopromocao: string;
	precoalterado: string;
	unidademedida: string;
} {
	const { produto, idcontamesa, idgarcom, quantidade = "1" } = params;

	if (!produto.idunidademedida) {
		throw new Error("Produto sem unidade de medida cadastrada");
	}
	if (!produto.preco) {
		throw new Error("Produto sem preço cadastrado");
	}

	return {
		idcontamesa,
		idproduto: produto.id,
		idgarcom,
		nomeproduto: produto.nome.slice(0, 120),
		quantidade,
		precounitario: formatPrecoItem(produto.preco),
		precopromocao: "0",
		precoalterado: "0",
		unidademedida: produto.idunidademedida,
	};
}

export interface CarrinhoLocalItem {
	idproduto: string;
	nomeproduto: string;
	quantidade: string;
	precounitario: string;
	unidademedida: string;
	observacao?: string;
	codigo?: number | null;
}

export type MeioPagamentoPdv = "dinheiro" | "cartao" | "pix" | "prepago";

export interface PagamentoParcialPdv {
	meio: MeioPagamentoPdv;
	valor: number;
	label: string;
}

export interface CupomItemLinha {
	codigo?: number | null;
	nome: string;
	quantidade: string;
	precounitario: string;
}

export interface CupomNaoFiscalData {
	vendaId?: string;
	empresaNome: string;
	dataHora: Date;
	itens: CupomItemLinha[];
	subtotal: number;
	desconto: number;
	taxaServico: number;
	couvert: number;
	total: number;
	pagamentos: PagamentoParcialPdv[];
	troco: number;
	contexto?: string;
}

export const MEIOS_PAGAMENTO_PDV: Array<{
	id: MeioPagamentoPdv;
	label: string;
	campo: keyof PagamentosFechar;
}> = [
	{ id: "dinheiro", label: "Dinheiro", campo: "valordinheiro" },
	{ id: "cartao", label: "Cartão", campo: "valorcartao" },
	{ id: "pix", label: "PIX", campo: "valorpix" },
	{ id: "prepago", label: "Pré-pago", campo: "valorprepago" },
];

export function pagamentosToFecharContaForm(
	pagamentos: PagamentoParcialPdv[],
	ajustes: {
		desconto?: number;
		taxaServico?: number;
		couvert?: number;
	},
): import("@/schemas/fechar-conta.schema").FecharContaFormData {
	const acumulado: PagamentosFechar = {};

	for (const p of pagamentos) {
		const meio = MEIOS_PAGAMENTO_PDV.find((m) => m.id === p.meio);
		if (!meio) continue;
		const atual = acumulado[meio.campo] ?? "0";
		acumulado[meio.campo] = (parseValor(atual) + p.valor).toFixed(2);
	}

	return {
		valordinheiro: acumulado.valordinheiro ?? "",
		valorcartao: acumulado.valorcartao ?? "",
		valorpix: acumulado.valorpix ?? "",
		valorprepago: acumulado.valorprepago ?? "",
		desconto: ajustes.desconto ? ajustes.desconto.toFixed(2) : "",
		valortaxaservico: ajustes.taxaServico ? ajustes.taxaServico.toFixed(2) : "",
		valorcouverartistico: ajustes.couvert ? ajustes.couvert.toFixed(2) : "",
	};
}

export function totalPagamentosParciais(pagamentos: PagamentoParcialPdv[]): number {
	return pagamentos.reduce((acc, p) => acc + p.valor, 0);
}

export function getEstoqueProduto(produto: {
	quantidadepadrao?: number | null;
}): string {
	if (
		produto.quantidadepadrao === null ||
		produto.quantidadepadrao === undefined
	) {
		return "—";
	}
	return String(produto.quantidadepadrao);
}
