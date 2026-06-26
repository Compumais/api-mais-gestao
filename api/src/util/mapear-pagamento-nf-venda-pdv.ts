import {
	formatarValorMonetario,
	parseValorMonetario,
} from "@/util/recebimentos-venda-util.js";

export const NUMERO_PDV_NOTA_FISCAL = 0;

export type PagamentosVendaPdvMapeados = {
	valordinheiro: string;
	valorcartaocredito: string;
	valorcartaodebito: string;
	valorcartao: string;
	valorpix: string;
	valorprepago: string;
	valortotal: string;
};

function somarValoresMonetarios(
	atual: string,
	adicional: number,
): string {
	return formatarValorMonetario(parseValorMonetario(atual) + adicional);
}

export function criarPagamentosVendaPdvZerados(
	valortotal: number,
): PagamentosVendaPdvMapeados {
	return {
		valordinheiro: "0",
		valorcartaocredito: "0",
		valorcartaodebito: "0",
		valorcartao: "0",
		valorpix: "0",
		valorprepago: "0",
		valortotal: formatarValorMonetario(valortotal),
	};
}

export function acumularPagamentoPorTPag(
	pagamentos: PagamentosVendaPdvMapeados,
	tPag: string,
	valor: number,
): PagamentosVendaPdvMapeados {
	if (!Number.isFinite(valor) || valor <= 0) {
		return pagamentos;
	}

	switch (tPag) {
		case "01":
			return {
				...pagamentos,
				valordinheiro: somarValoresMonetarios(pagamentos.valordinheiro, valor),
			};
		case "03":
			return {
				...pagamentos,
				valorcartaocredito: somarValoresMonetarios(
					pagamentos.valorcartaocredito,
					valor,
				),
			};
		case "04":
			return {
				...pagamentos,
				valorcartaodebito: somarValoresMonetarios(
					pagamentos.valorcartaodebito,
					valor,
				),
			};
		case "17":
			return {
				...pagamentos,
				valorpix: somarValoresMonetarios(pagamentos.valorpix, valor),
			};
		case "15":
			return {
				...pagamentos,
				valorcartao: somarValoresMonetarios(pagamentos.valorcartao, valor),
			};
		default:
			return {
				...pagamentos,
				valorcartao: somarValoresMonetarios(pagamentos.valorcartao, valor),
			};
	}
}
