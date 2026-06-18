import { api } from "@/lib/axios";

export interface Produto {
	id: string;
	idempresa: string;
	codigo: number | null;
	ean: number | null;
	referencia: string | null;
	nome: string;
	descricao: string;
	idunidademedida: string | null;
	fornecedor: string | null;
	idgrupo: string | null;
	preco: string | null;
	tipo: string | null;
	iat: string | null;
	ippt: string | null;
	origem: number | null;
	ncm: string | null;
	observacoes: string | null;
	inativo: number | null;
	enviamobile?: number | null;
	datacadastro: string;
	quantidadepadrao?: number | null;
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

export interface CriarProdutoData {
	idempresa: string;
	codigo: number;
	ean?: number | null;
	referencia?: string | null;
	nome: string;
	idunidademedida: string;
	fornecedor?: string | null;
	idgrupo: string;
	preco: string;
	tipo?: string;
	iat?: string | null;
	ippt: string;
	origem: number;
	ncm: string;
	observacoes?: string | null;
	enviamobile?: number | null;
}

export interface AtualizarProdutoData {
	codigo?: number;
	ean?: number | null;
	referencia?: string | null;
	nome?: string;
	idunidademedida?: string;
	fornecedor?: string | null;
	idgrupo?: string;
	preco?: string;
	tipo?: string;
	iat?: string | null;
	ippt?: string;
	origem?: number;
	ncm?: string;
	observacoes?: string | null;
	enviamobile?: number | null;
}

export const produtosService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
		inativo?: number;
	}): Promise<ListarProdutosResponse> {
		const { data } = await api.get<ListarProdutosResponse>("/produtos", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<Produto> {
		const { data } = await api.get<Produto>(`/produtos/${id}`);
		return data;
	},

	async criar(dados: CriarProdutoData): Promise<Produto> {
		const { data } = await api.post<Produto>("/produtos", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarProdutoData,
		idempresa: string,
	): Promise<Produto> {
		const { data } = await api.put<Produto>(`/produtos/${id}`, dados, {
			params: { idempresa },
		});
		return data;
	},

	async inativar(
		id: string,
		inativo: number,
		idempresa: string,
	): Promise<Produto> {
		const { data } = await api.patch<Produto>(`/produtos/inativar/${id}`, {
			inativo,
			idempresa,
		});
		return data;
	},

	async deletar(id: string, idempresa: string): Promise<void> {
		await api.delete(`/produtos/${id}`, {
			params: { idempresa },
		});
	},

	async buscarProximoCodigo(
		idempresa: string,
	): Promise<{ codigo: number }> {
		const { data } = await api.get<{ codigo: number }>(
			"/produtos/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},
};
