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

export const STATUS_CAIXA = {
	ABERTO: 0,
	FECHADO: 1,
} as const;

export const STATUS_CAIXA_LABEL: Record<number, string> = {
	0: "Aberto",
	1: "Fechado",
};

const NUMERO_PDV_KEY = "gourmet:numeropdv";

export interface ItemComPreco {
	quantidade: string;
	precounitario: string;
	taxaservico?: number | null;
}

export interface PagamentosFechar {
	valordinheiro?: string | null;
	valorcartao?: string | null;
	valorcartaocredito?: string | null;
	valorcartaodebito?: string | null;
	valorpix?: string | null;
	valorprepago?: string | null;
}

export interface PagamentosResumo {
	dinheiro: number;
	cartao: number;
	pix: number;
	prepago: number;
	total: number;
}

export interface PagamentosRegistro extends PagamentosFechar {
	valortroco?: string | null;
	valortotal?: string | null;
}

export function pagamentosResumoVazio(): PagamentosResumo {
	return { dinheiro: 0, cartao: 0, pix: 0, prepago: 0, total: 0 };
}

export function extrairPagamentosResumo(
	registro: PagamentosRegistro,
): PagamentosResumo {
	const dinheiroBruto = parseValor(registro.valordinheiro);
	const troco = parseValor(registro.valortroco);
	const cartao =
		parseValor(registro.valorcartaocredito) +
		parseValor(registro.valorcartaodebito) +
		parseValor(registro.valorcartao);
	const pix = parseValor(registro.valorpix);
	const prepago = parseValor(registro.valorprepago);
	const dinheiro = Math.max(0, dinheiroBruto - troco);
	const totalInformado = parseValor(registro.valortotal);
	const total =
		totalInformado > 0 ? totalInformado : dinheiro + cartao + pix + prepago;

	return { dinheiro, cartao, pix, prepago, total };
}

export function somarPagamentosResumo(
	a: PagamentosResumo,
	b: PagamentosResumo,
): PagamentosResumo {
	return {
		dinheiro: a.dinheiro + b.dinheiro,
		cartao: a.cartao + b.cartao,
		pix: a.pix + b.pix,
		prepago: a.prepago + b.prepago,
		total: a.total + b.total,
	};
}

export function parseValor(value: string | null | undefined): number {
	if (!value) return 0;
	const parsed = Number.parseFloat(value);
	return Number.isNaN(parsed) ? 0 : parsed;
}

export function arredondarMoeda(valor: number): number {
	if (!Number.isFinite(valor)) return 0;
	return Math.round(valor * 100) / 100;
}

export function pagamentoCobreTotal(pago: number, total: number): boolean {
	return arredondarMoeda(pago) >= arredondarMoeda(total);
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
	const subtotal = itens.reduce((acc, item) => {
		const qty = parseValor(item.quantidade);
		const preco = parseValor(item.precounitario);
		return acc + qty * preco;
	}, 0);
	return arredondarMoeda(subtotal);
}

export function calcularTotalComTaxas(
	subtotal: number,
	desconto = 0,
	taxaServico = 0,
	couvert = 0,
): number {
	return arredondarMoeda(
		Math.max(0, subtotal - desconto + taxaServico + couvert),
	);
}

export function calcularTotalPago(pagamentos: PagamentosFechar): number {
	return arredondarMoeda(
		parseValor(pagamentos.valordinheiro) +
			parseValor(pagamentos.valorcartaocredito) +
			parseValor(pagamentos.valorcartaodebito) +
			parseValor(pagamentos.valorcartao) +
			parseValor(pagamentos.valorpix) +
			parseValor(pagamentos.valorprepago),
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

export type MeioPagamentoPdv =
	| "dinheiro"
	| "cartao_credito"
	| "cartao_debito"
	| "pix"
	| "prepago";

export type PagamentoParcialPdv =
	| {
			tipo: "meio";
			meio: MeioPagamentoPdv;
			valor: number;
			label: string;
	  }
	| {
			tipo: "erp";
			idtipodocumentofinanceiro: string;
			valor: number;
			label: string;
			aprazo: boolean;
	  };

export function isPagamentoMeioPdv(
	pagamento: PagamentoParcialPdv,
): pagamento is Extract<PagamentoParcialPdv, { tipo: "meio" }> {
	return pagamento.tipo === "meio";
}

export function isPagamentoErpPdv(
	pagamento: PagamentoParcialPdv,
): pagamento is Extract<PagamentoParcialPdv, { tipo: "erp" }> {
	return pagamento.tipo === "erp";
}

export function pagamentoPdvExigeCliente(
	pagamentos: PagamentoParcialPdv[],
): boolean {
	return pagamentos.some((p) => isPagamentoErpPdv(p) && p.aprazo);
}

export function extrairPagamentosErpForm(
	pagamentos: PagamentoParcialPdv[],
): { idtipodocumentofinanceiro: string; valor: string }[] {
	return pagamentos
		.filter(isPagamentoErpPdv)
		.map((p) => ({
			idtipodocumentofinanceiro: p.idtipodocumentofinanceiro,
			valor: p.valor.toFixed(2),
		}));
}

export interface CupomItemLinha {
	codigo?: number | null;
	nome: string;
	quantidade: string;
	precounitario: string;
}

export interface CupomNfceInfo {
	idnotafiscal: string;
	chave: string;
	protocolo?: string;
	ambiente?: number;
	qrCode?: string;
	urlChave?: string;
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
	nfce?: CupomNfceInfo;
}

export interface ConfirmacaoVendaPdvResult {
	vendaId: string;
	nfce?: CupomNfceInfo;
}

export function buildCupomNfceInfo(
	emissao: {
		emitida?: boolean;
		idnotafiscal?: string;
		chave?: string;
		protocolo?: string;
		qrCode?: string;
		urlChave?: string;
	} | undefined,
	ambiente?: number | null,
): CupomNfceInfo | undefined {
	if (!emissao?.emitida || !emissao.chave || !emissao.idnotafiscal) {
		return undefined;
	}

	return {
		idnotafiscal: emissao.idnotafiscal,
		chave: emissao.chave,
		protocolo: emissao.protocolo,
		ambiente: ambiente ?? undefined,
		qrCode: emissao.qrCode,
		urlChave: emissao.urlChave,
	};
}

export function montarUrlImagemQrCodeNfce(conteudo: string, tamanho = 180): string {
	return `https://api.qrserver.com/v1/create-qr-code/?size=${tamanho}x${tamanho}&data=${encodeURIComponent(conteudo)}`;
}

export const MEIOS_PAGAMENTO_PDV: Array<{
	id: MeioPagamentoPdv;
	label: string;
	campo: keyof PagamentosFechar;
}> = [
	{ id: "dinheiro", label: "Dinheiro", campo: "valordinheiro" },
	{ id: "cartao_credito", label: "Cartão Crédito", campo: "valorcartaocredito" },
	{ id: "cartao_debito", label: "Cartão Débito", campo: "valorcartaodebito" },
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
		if (!isPagamentoMeioPdv(p)) continue;
		const meio = MEIOS_PAGAMENTO_PDV.find((m) => m.id === p.meio);
		if (!meio) continue;
		const atual = acumulado[meio.campo] ?? "0";
		acumulado[meio.campo] = (parseValor(atual) + p.valor).toFixed(2);
	}

	return {
		valordinheiro: acumulado.valordinheiro ?? "",
		valorcartaocredito: acumulado.valorcartaocredito ?? "",
		valorcartaodebito: acumulado.valorcartaodebito ?? "",
		valorcartao: acumulado.valorcartao ?? "",
		valorpix: acumulado.valorpix ?? "",
		valorprepago: acumulado.valorprepago ?? "",
		desconto: ajustes.desconto ? ajustes.desconto.toFixed(2) : "",
		valortaxaservico: ajustes.taxaServico ? ajustes.taxaServico.toFixed(2) : "",
		valorcouverartistico: ajustes.couvert ? ajustes.couvert.toFixed(2) : "",
	};
}

export function fecharContaFormToPagamentosParciais(
	form: import("@/schemas/fechar-conta.schema").FecharContaFormData,
): PagamentoParcialPdv[] {
	const pagamentos: PagamentoParcialPdv[] = [];

	for (const meio of MEIOS_PAGAMENTO_PDV) {
		const valor = parseValor(form[meio.campo] ?? "");
		if (valor > 0) {
			pagamentos.push({
				tipo: "meio",
				meio: meio.id,
				valor,
				label: meio.label,
			});
		}
	}

	// Legado: valorcartao sem crédito/débito separados → exibir como crédito
	const valorCartaoLegado = parseValor(form.valorcartao ?? "");
	const jaTemCredito = pagamentos.some(
		(p) => isPagamentoMeioPdv(p) && p.meio === "cartao_credito",
	);
	if (valorCartaoLegado > 0 && !jaTemCredito) {
		pagamentos.push({
			tipo: "meio",
			meio: "cartao_credito",
			valor: valorCartaoLegado,
			label: "Cartão Crédito",
		});
	}

	return pagamentos;
}

export function vendaPagamentosToFecharContaForm(
	registro: PagamentosRegistro,
): import("@/schemas/fechar-conta.schema").FecharContaFormData {
	return {
		valordinheiro: registro.valordinheiro ?? "",
		valorcartaocredito: registro.valorcartaocredito ?? "",
		valorcartaodebito: registro.valorcartaodebito ?? "",
		valorcartao: registro.valorcartao ?? "",
		valorpix: registro.valorpix ?? "",
		valorprepago: registro.valorprepago ?? "",
		desconto: "",
		valortaxaservico: "",
		valorcouverartistico: "",
	};
}

export function totalPagamentosParciais(pagamentos: PagamentoParcialPdv[]): number {
	return arredondarMoeda(pagamentos.reduce((acc, p) => acc + p.valor, 0));
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
