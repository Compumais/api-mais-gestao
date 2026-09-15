import { api } from "@/lib/axios";

export type FichaProducaoItem = {
	id?: string;
	idproduto: string;
	quantidade: string;
	ordem?: number;
	nomeproduto?: string | null;
	codigoproduto?: number | string | null;
	unidademedida?: string | null;
	custoaquisicao?: string | null;
	customedioinicial?: string | null;
	precoultimacompra?: string | null;
};

export type FichaProducao = {
	id: string;
	idempresa: string;
	idprodutoacabado: string;
	ativo: number;
	permiteproducaomassa: number;
	producaonavenda: number;
	observacao: string | null;
	criadoem?: string;
	atualizadoem?: string;
	nomeprodutoacabado?: string | null;
	codigoprodutoacabado?: number | string | null;
	unidademedidaacabado?: string | null;
	itens?: FichaProducaoItem[];
};

export type ListarFichasProducaoResponse = {
	data: FichaProducao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type CriarFichaProducaoData = {
	idempresa: string;
	idprodutoacabado: string;
	permiteproducaomassa: boolean;
	producaonavenda: boolean;
	observacao?: string | null;
	itens: Array<{ idproduto: string; quantidade: string; ordem?: number }>;
};

export type AtualizarFichaProducaoData = {
	idprodutoacabado?: string;
	permiteproducaomassa?: boolean;
	producaonavenda?: boolean;
	observacao?: string | null;
	ativo?: boolean;
	itens?: Array<{ idproduto: string; quantidade: string; ordem?: number }>;
};

export type ResultadoProducao = {
	id: string;
	idfichaproducao: string;
	idprodutoacabado: string;
	origem: number;
	quantidadeproduzida: string;
	custototal: string;
	custounitario: string;
	tipoestoque: number;
	idoriginal: string | null;
};

export const fichaProducaoService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		q?: string;
		codigo?: string;
		nome?: string;
		ativo?: number;
		permiteproducaomassa?: number;
		producaonavenda?: number;
		ordenarPor?: string;
		ordem?: "asc" | "desc";
	}): Promise<ListarFichasProducaoResponse> {
		const { data } = await api.get<ListarFichasProducaoResponse>(
			"/fichas-producao",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<FichaProducao> {
		const { data } = await api.get<FichaProducao>(`/fichas-producao/${id}`);
		return data;
	},

	async criar(dados: CriarFichaProducaoData): Promise<FichaProducao> {
		const { data } = await api.post<FichaProducao>("/fichas-producao", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarFichaProducaoData,
	): Promise<FichaProducao> {
		const { data } = await api.put<FichaProducao>(
			`/fichas-producao/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/fichas-producao/${id}`);
	},

	async produzir(
		id: string,
		quantidade: string,
	): Promise<ResultadoProducao> {
		const { data } = await api.post<ResultadoProducao>(
			`/fichas-producao/${id}/produzir`,
			{ quantidade },
		);
		return data;
	},
};
