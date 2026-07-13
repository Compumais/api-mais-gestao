import { api } from "@/lib/axios";

export interface Produto {
	id: string;
	idempresa: string;
	codigo: number | null;
	ean: number | null;
	eantributavel?: string | null;
	referencia: string | null;
	nome: string;
	descricao: string;
	idunidademedida: string | null;
	fornecedor: string | null;
	idgrupo: string | null;
	preco: string | null;
	custoaquisicao?: string | null;
	tipo: string | null;
	iat: string | null;
	ippt: string | null;
	origem: number | null;
	ncm: string | null;
	tipoproduto?: string | null;
	observacoes: string | null;
	inativo: number | null;
	enviamobile?: number | null;
	datacadastro: string;
	quantidadepadrao?: number | null;
	quantidademinima?: number | null;
	quantidademaxima?: number | null;
	idcfopentrada?: string | null;
	idcfopsaida?: string | null;
	idcfopsaidanfce?: string | null;
	idcest?: string | null;
	idtaxauf?: string | null;
	situacaotributariasnentrada?: string | null;
	situacaotributaria?: string | null;
	situacaotributariasn?: string | null;
	tributacaoespecial?: string | null;
	tributacaosn?: string | null;
	cstpisentrada?: string | number | null;
	cstcofinsentrada?: string | number | null;
	cstpis?: string | number | null;
	cstcofins?: string | number | null;
	cstipientrada?: string | null;
	cstipisaida?: string | null;
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
	custoaquisicao?: string | null;
	tipo?: string;
	iat?: string | null;
	ippt: string;
	origem: number;
	ncm: string;
	tipoproduto?: string | null;
	observacoes?: string | null;
	enviamobile?: number | null;
	quantidadepadrao?: number | null;
	quantidademinima?: number | null;
	quantidademaxima?: number | null;
	idcfopentrada?: string | null;
	idcfopsaida?: string | null;
	idcfopsaidanfce?: string | null;
	idcest?: string | null;
	idtaxauf?: string | null;
	situacaotributariasnentrada?: string | null;
	situacaotributaria?: string | null;
	situacaotributariasn?: string | null;
	tributacaoespecial?: string | null;
	tributacaosn?: string | null;
	cstpisentrada?: string | null;
	cstcofinsentrada?: string | null;
	cstpis?: string | null;
	cstcofins?: string | null;
	cstipientrada?: string | null;
	cstipisaida?: string | null;
}

export interface TributacaoPorCfopResponse {
	idcfopsaida?: string | null;
	idcfopsaidanfce?: string | null;
	situacaotributaria?: string | null;
	situacaotributariasn?: string | null;
	tributacaoespecial?: string | null;
	tributacaosn?: string | null;
	cfopvendaecf?: number | null;
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
	custoaquisicao?: string | null;
	tipo?: string;
	iat?: string | null;
	ippt?: string;
	origem?: number;
	ncm?: string;
	tipoproduto?: string | null;
	observacoes?: string | null;
	enviamobile?: number | null;
	quantidadepadrao?: number | null;
	quantidademinima?: number | null;
	quantidademaxima?: number | null;
	idcfopentrada?: string | null;
	idcfopsaida?: string | null;
	idcfopsaidanfce?: string | null;
	idcest?: string | null;
	idtaxauf?: string | null;
	situacaotributariasnentrada?: string | null;
	situacaotributaria?: string | null;
	situacaotributariasn?: string | null;
	tributacaoespecial?: string | null;
	tributacaosn?: string | null;
	cstpisentrada?: string | null;
	cstcofinsentrada?: string | null;
	cstpis?: string | null;
	cstcofins?: string | null;
	cstipientrada?: string | null;
	cstipisaida?: string | null;
}

export const produtosService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
		q?: string;
		inativo?: number;
	}): Promise<ListarProdutosResponse> {
		const { data } = await api.get<ListarProdutosResponse>("/produtos", {
			params,
		});
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		nome?: string;
		q?: string;
		inativo?: number;
	}): Promise<Produto[]> {
		const limite = 100;
		let pagina = 1;
		const registros: Produto[] = [];

		while (true) {
			const resposta = await produtosService.listar({
				...params,
				page: pagina,
				limit: limite,
			});

			registros.push(...resposta.data);

			if (pagina >= resposta.paginacao.totalPages) {
				break;
			}

			pagina += 1;
		}

		return registros;
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

	async tributacaoPorCfop(
		idempresa: string,
		idcfop: string,
	): Promise<TributacaoPorCfopResponse> {
		const { data } = await api.get<TributacaoPorCfopResponse>(
			"/produtos/tributacao-por-cfop",
			{ params: { idempresa, idcfop } },
		);
		return data;
	},
};
