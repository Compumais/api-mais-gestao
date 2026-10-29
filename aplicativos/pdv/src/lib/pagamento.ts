import type {
	LancamentoPagamento,
	MeioPagamento,
	MeioPagamentoLocal,
} from "./pdv-types";

export const CHAVE_TECLADO_VIRTUAL_PAGAMENTO = "teclado_virtual_pagamento";

export type BotaoMeioPagamento = {
	id: string;
	meio: MeioPagamento;
	label: string;
	aprazo: number;
	formapagamentonfe: string | null;
};

export const MEIOS_PAGAMENTO_PADRAO: BotaoMeioPagamento[] = [
	{
		id: "DINHEIRO",
		meio: "DINHEIRO",
		label: "Dinheiro",
		aprazo: 0,
		formapagamentonfe: "01",
	},
	{
		id: "PIX",
		meio: "PIX",
		label: "PIX",
		aprazo: 0,
		formapagamentonfe: "17",
	},
	{
		id: "CARTAO",
		meio: "CARTAO",
		label: "Cartão",
		aprazo: 0,
		formapagamentonfe: "03",
	},
];

export function tecladoVirtualPagamentoAtivo(raw: unknown): boolean {
	const valor = String(raw ?? "1")
		.trim()
		.toLowerCase();
	return (
		valor !== "0" && valor !== "false" && valor !== "nao" && valor !== "não"
	);
}

export function arredondarDinheiro(valor: number): number {
	return Math.round(valor * 100) / 100;
}

/** Desconto em R$ ou %, sem zerar a venda (NFC-e exige vNF > 0). */
export function calcularDescontoInformado(
	subtotal: number,
	informado: number,
	percentual: boolean,
): number {
	const base = arredondarDinheiro(Math.max(0, subtotal));
	if (!(base > 0) || !(informado > 0)) return 0;
	const bruto = percentual ? (base * informado) / 100 : informado;
	const maximo = arredondarDinheiro(Math.max(0, base - 0.01));
	return arredondarDinheiro(Math.min(maximo, Math.max(0, bruto)));
}

/** Acréscimo operacional em R$ ou % sobre a base (total da conta). */
export function calcularAcrescimoInformado(
	base: number,
	informado: number,
	percentual: boolean,
): number {
	if (!(informado > 0)) return 0;
	const referencia = arredondarDinheiro(Math.max(0, base));
	if (percentual) {
		if (!(referencia > 0)) return 0;
		return arredondarDinheiro((referencia * informado) / 100);
	}
	return arredondarDinheiro(informado);
}

export function lancamentosEfetivos(
	lancamentos: LancamentoPagamento[],
): LancamentoPagamento[] {
	return lancamentos.filter((item) => (item.status ?? "ok") === "ok");
}

export function somarLancamentos(lancamentos: LancamentoPagamento[]): number {
	return arredondarDinheiro(
		lancamentosEfetivos(lancamentos).reduce((acc, item) => acc + item.valor, 0),
	);
}

export function saldoRestante(
	total: number,
	lancamentos: LancamentoPagamento[],
): number {
	return arredondarDinheiro(
		Math.max(0, arredondarDinheiro(total) - somarLancamentos(lancamentos)),
	);
}

export function trocoEstimado(
	total: number,
	lancamentos: LancamentoPagamento[],
): number {
	const pago = somarLancamentos(lancamentos);
	const excesso = arredondarDinheiro(
		Math.max(0, pago - arredondarDinheiro(total)),
	);
	const temDinheiro = lancamentosEfetivos(lancamentos).some(
		(item) => item.meio === "DINHEIRO",
	);
	return temDinheiro ? excesso : 0;
}

export function podeFecharPagamentos(
	total: number,
	lancamentos: LancamentoPagamento[],
): boolean {
	if (!lancamentosEfetivos(lancamentos).length) {
		return false;
	}
	if (lancamentos.some((item) => (item.status ?? "ok") === "pendente")) {
		return false;
	}
	if (saldoRestante(total, lancamentos) > 0) {
		return false;
	}
	const pago = somarLancamentos(lancamentos);
	const excesso = arredondarDinheiro(pago - arredondarDinheiro(total));
	if (excesso > 0) {
		return lancamentosEfetivos(lancamentos).some(
			(item) => item.meio === "DINHEIRO",
		);
	}
	return true;
}

export function rotuloMeio(
	meio: MeioPagamento,
	descricao?: string | null,
): string {
	if (descricao?.trim()) return descricao.trim();
	if (meio === "CARTAO") return "Cartão";
	if (meio === "PIX") return "PIX";
	if (meio === "OUTROS") return "Outros";
	return "Dinheiro";
}

export function meioNativoDaFormaNfe(
	codigo: string | null | undefined,
): Exclude<MeioPagamento, "OUTROS"> | null {
	const digits = String(codigo ?? "").replace(/\D/g, "");
	const pad = digits.padStart(2, "0");
	if (pad === "01") return "DINHEIRO";
	if (pad === "17") return "PIX";
	if (pad === "03" || pad === "04") return "CARTAO";
	return null;
}

export function meioDaFormaNfe(
	codigo: string | null | undefined,
): MeioPagamento {
	return meioNativoDaFormaNfe(codigo) ?? "OUTROS";
}

/** Dinheiro, PIX e cartão são à vista no PDV, mesmo se o cadastro ERP estiver marcado a prazo. */
export function ehPagamentoAPrazo(params: {
	aprazo?: number | string | boolean | null;
	meio?: string | null;
	formapagamentonfe?: string | null;
}): boolean {
	const meio = String(params.meio ?? "")
		.trim()
		.toUpperCase();
	if (meio === "DINHEIRO" || meio === "PIX" || meio === "CARTAO") {
		return false;
	}
	if (meioNativoDaFormaNfe(params.formapagamentonfe)) {
		return false;
	}
	return Number(params.aprazo) === 1;
}

export function montarBotoesMeiosPagamento(
	lista: MeioPagamentoLocal[],
): BotaoMeioPagamento[] {
	if (!lista.length) {
		return MEIOS_PAGAMENTO_PADRAO;
	}
	return lista.map((item) => {
		const meio = meioDaFormaNfe(item.formapagamentonfe);
		return {
			id: item.id,
			meio,
			label: item.descricao,
			aprazo: ehPagamentoAPrazo({
				aprazo: item.aprazo,
				meio,
				formapagamentonfe: item.formapagamentonfe,
			})
				? 1
				: 0,
			formapagamentonfe: item.formapagamentonfe,
		};
	});
}

export function rotuloPagamentoVenda(venda: {
	meio_pagamento: string;
	valordinheiro?: number;
	valorpix?: number;
	valorcartao?: number;
}): string {
	const partes: string[] = [];
	if ((Number(venda.valordinheiro) || 0) > 0.009) partes.push("Dinheiro");
	if ((Number(venda.valorpix) || 0) > 0.009) partes.push("PIX");
	if ((Number(venda.valorcartao) || 0) > 0.009) partes.push("Cartão");
	if (partes.length) return partes.join(" + ");
	const meio = String(venda.meio_pagamento ?? "").toUpperCase();
	if (meio === "MISTO") return "Misto";
	if (meio === "CARTAO") return "Cartão";
	if (meio === "PIX") return "PIX";
	if (meio === "DINHEIRO") return "Dinheiro";
	if (meio === "OUTROS") return "Outros";
	return venda.meio_pagamento || "—";
}

export function reaisParaDigitos(valor: number): string {
	return String(Math.max(0, Math.round(arredondarDinheiro(valor) * 100)));
}

export function lancamentoTemSitef(item: LancamentoPagamento): boolean {
	return (
		item.meio === "CARTAO" &&
		Boolean(item.nsu || item.autorizacao) &&
		(item.status ?? "ok") === "ok"
	);
}
