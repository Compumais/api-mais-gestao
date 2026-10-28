import { api } from "@/lib/axios";

export type PontoPrecoCusto = {
	data: string;
	precoVenda: number | null;
	custo: number | null;
};

export type PontoCompraVenda = {
	data: string;
	compra: number;
	venda: number;
};

export type PontoEstoque = {
	data: string;
	entrada: number;
	saida: number;
	saldo: number;
};

type FiltroBase = {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
};

export const produtoAnalyticsService = {
	async precoCusto(
		idproduto: string,
		params: FiltroBase,
	): Promise<{ pontos: PontoPrecoCusto[] }> {
		const { data } = await api.get<{ pontos: PontoPrecoCusto[] }>(
			`/produtos/${idproduto}/analytics/preco-custo`,
			{ params },
		);
		return data;
	},

	async compraVenda(
		idproduto: string,
		params: FiltroBase & { granularidade?: "dia" | "semana" | "mes" },
	): Promise<{ pontos: PontoCompraVenda[] }> {
		const { data } = await api.get<{ pontos: PontoCompraVenda[] }>(
			`/produtos/${idproduto}/analytics/compra-venda`,
			{ params },
		);
		return data;
	},

	async estoque(
		idproduto: string,
		params: FiltroBase & { tipoEstoque?: number },
	): Promise<{ pontos: PontoEstoque[] }> {
		const { data } = await api.get<{ pontos: PontoEstoque[] }>(
			`/produtos/${idproduto}/analytics/estoque`,
			{ params },
		);
		return data;
	},
};
