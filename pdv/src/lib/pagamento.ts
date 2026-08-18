import type { LancamentoPagamento, MeioPagamento } from "./pdv-types";

export function arredondarDinheiro(valor: number): number {
	return Math.round(valor * 100) / 100;
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

export function rotuloMeio(meio: MeioPagamento): string {
	if (meio === "CARTAO") return "Cartão";
	if (meio === "PIX") return "PIX";
	return "Dinheiro";
}

export function meioNativoDaFormaNfe(
	codigo: string | null | undefined,
): MeioPagamento | null {
	const digits = String(codigo ?? "").replace(/\D/g, "");
	const pad = digits.padStart(2, "0");
	if (pad === "01") return "DINHEIRO";
	if (pad === "17") return "PIX";
	if (pad === "03" || pad === "04") return "CARTAO";
	return null;
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
