import { api } from "@/lib/axios";

export interface EntradaHistoricoComposicao {
	id: string;
	datahora: string;
	precocompra: string | null;
	custo: string | null;
	custoaquisicao: string | null;
	customedio: string | null;
	desconto: string | null;
	ipi: string | null;
	icmsst: string | null;
	fretesegurooutrasdesp: string | null;
	origem: number | null;
	idnotafiscal: string | null;
	numeronotafiscal: string | null;
	razaosocial: string | null;
	datahoraemissao: string | null;
	idultimousuario: string | null;
	nomeusuario: string | null;
}

export interface ListarHistoricoComposicaoResponse {
	data: EntradaHistoricoComposicao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ListarHistoricoComposicaoParams {
	idproduto: string;
	page?: number;
	limit?: number;
}

export const custoProdutoService = {
	async listarHistoricoComposicao(
		params: ListarHistoricoComposicaoParams,
	): Promise<ListarHistoricoComposicaoResponse> {
		const { data } = await api.get<ListarHistoricoComposicaoResponse>(
			"/custos-produto/historico",
			{ params },
		);
		return data;
	},
};
