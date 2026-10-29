import { api } from "@/src/api/client";

export interface Produto {
	id: string;
	idempresa: string;
	codigo: number | null;
	nome: string;
	preco: string | null;
	ncm?: string | null;
	unidademedida?: string | null;
	origem?: number | null;
	inativo?: number | null;
	idunidademedida?: string | null;
	idcfopsaida?: string | null;
	situacaotributaria?: string | null;
	situacaotributariasn?: string | null;
	cstpis?: string | number | null;
	cstcofins?: string | number | null;
	ean?: number | string | null;
	controlalote?: number | null;
}

export interface ListarProdutosResponse {
	data: Produto[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface UnidadeMedida {
	id: string;
	codigo: string;
	descricao: string;
}

export const produtosService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		q?: string;
	}) {
		const { data } = await api.get<ListarProdutosResponse>("/produtos", {
			params,
		});
		return data;
	},

	async buscar(id: string) {
		const { data } = await api.get<Produto>(`/produtos/${id}`);
		return data;
	},

	async proximoCodigo(idempresa: string) {
		const { data } = await api.get<{ codigo: number }>(
			"/produtos/proximo-codigo",
			{ params: { idempresa } },
		);
		return data.codigo;
	},

	async listarUnidades(idempresa: string) {
		const { data } = await api.get<{ data: UnidadeMedida[] }>(
			"/unidades-medida",
			{ params: { idempresa, limit: 200 } },
		);
		return data.data ?? [];
	},

	async criar(body: Record<string, unknown>) {
		const { data } = await api.post<Produto>("/produtos", body);
		return data;
	},

	async atualizar(id: string, body: Record<string, unknown>) {
		const { data } = await api.put<Produto>(`/produtos/${id}`, body);
		return data;
	},

	async tributacaoPorCfop(idempresa: string, idcfop: string) {
		const { data } = await api.get<Record<string, unknown>>(
			"/produtos/tributacao-por-cfop",
			{ params: { idempresa, idcfop } },
		);
		return data;
	},
};
