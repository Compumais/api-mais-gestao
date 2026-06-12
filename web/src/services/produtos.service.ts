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
	datacadastro: string;
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

	async atualizar(id: string, dados: AtualizarProdutoData): Promise<Produto> {
		const { data } = await api.put<Produto>(`/produtos/${id}`, dados);
		return data;
	},

	async inativar(id: string, inativo: number): Promise<Produto> {
		const { data } = await api.patch<Produto>(`/produtos/inativar/${id}`, {
			inativo,
		});
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/produtos/${id}`);
	},
};
