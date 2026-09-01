import type { LancamentoPagamentoPdv } from "@/model/venda-pdv-pagamento-model.js";
import type { NovaVendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import {
	formatarValorMonetario,
	normalizarValorPagamentoParaBanco,
} from "@/util/recebimentos-venda-util.js";

export type TotaisLancamentosPdv = {
	valordinheiro: string;
	valorpix: string;
	valorcartaocredito: string;
	valorcartaodebito: string;
	valorcartao: string;
	valorprepago: string;
};

function arredondar(valor: number): number {
	return Math.round(valor * 100) / 100;
}

export function totaisDeLancamentosPdv(
	lancamentos: LancamentoPagamentoPdv[],
): TotaisLancamentosPdv {
	let dinheiro = 0;
	let pix = 0;
	let cartao = 0;

	for (const item of lancamentos) {
		if ((item.status ?? "ok") !== "ok") {
			continue;
		}
		if (item.meio === "DINHEIRO") {
			dinheiro = arredondar(dinheiro + item.valor);
		} else if (item.meio === "PIX") {
			pix = arredondar(pix + item.valor);
		} else {
			cartao = arredondar(cartao + item.valor);
		}
	}

	return {
		valordinheiro: formatarValorMonetario(dinheiro),
		valorpix: formatarValorMonetario(pix),
		valorcartaocredito: formatarValorMonetario(cartao),
		valorcartaodebito: formatarValorMonetario(0),
		valorcartao: formatarValorMonetario(0),
		valorprepago: formatarValorMonetario(0),
	};
}

export function campoPagamentoVazio(
	valor: string | number | null | undefined,
): boolean {
	if (valor == null || valor === "") {
		return true;
	}
	return Number.parseFloat(String(valor).replace(",", ".")) === 0;
}

export function normalizarCamposPagamentoVendaPdv(
	dados: NovaVendaPdvGourmet,
): NovaVendaPdvGourmet {
	return {
		...dados,
		valordinheiro: normalizarValorPagamentoParaBanco(dados.valordinheiro),
		valorcartao: normalizarValorPagamentoParaBanco(dados.valorcartao),
		valorcartaocredito: normalizarValorPagamentoParaBanco(
			dados.valorcartaocredito,
		),
		valorcartaodebito: normalizarValorPagamentoParaBanco(
			dados.valorcartaodebito,
		),
		valorpix: normalizarValorPagamentoParaBanco(dados.valorpix),
		valorprepago: normalizarValorPagamentoParaBanco(dados.valorprepago),
		valortroco: normalizarValorPagamentoParaBanco(dados.valortroco),
		valortotal: normalizarValorPagamentoParaBanco(dados.valortotal),
	};
}
