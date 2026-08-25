import { api } from "@/lib/axios";

export interface CotacaoCompraItem {
	id: string;
	idcotacao: string;
	idproduto: string | null;
	descricao: string | null;
	quantidade: string;
	unidademedida: string | null;
	observacao: string | null;
	ordem: number;
	codigoproduto: number | null;
	nomeproduto: string | null;
	descricaoproduto: string | null;
}

export interface CotacaoCompra {
	id: string;
	idempresa: string;
	codigo: number;
	titulo: string;
	observacao: string | null;
	status: string;
	tokenpublico: string | null;
	validade: string | null;
	currenttimemillis: number | null;
	itens?: CotacaoCompraItem[];
	totalpropostas: number;
}

export interface ListarCotacoesCompraResponse {
	data: CotacaoCompra[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarCotacaoCompraData {
	idempresa: string;
	titulo: string;
	observacao?: string | null;
	validade?: string | null;
	itens: Array<{
		idproduto?: string | null;
		descricao?: string | null;
		quantidade: string;
		unidademedida?: string | null;
		observacao?: string | null;
	}>;
}

export interface ComparativoPropostaItem {
	idproposta: string;
	nome: string;
	telefone: string;
	precounitario: number;
	menorpreco: boolean;
}

export interface ComparativoItem {
	idcotacaoitem: string;
	idproduto: string | null;
	descricao: string | null;
	codigoproduto: number | null;
	nomeproduto: string | null;
	quantidade: string;
	unidademedida: string | null;
	propostas: ComparativoPropostaItem[];
}

export interface ComparativoCotacao {
	cotacao: CotacaoCompra;
	itens: ComparativoItem[];
}

export interface CotacaoCompraPublicaItem {
	id: string;
	idproduto: string | null;
	descricao: string | null;
	quantidade: string;
	unidademedida: string | null;
	observacao: string | null;
	ordem: number;
	codigoproduto: number | null;
	nomeproduto: string | null;
	descricaoproduto: string | null;
}

export interface CotacaoCompraPublica {
	id: string;
	titulo: string;
	observacao: string | null;
	validade: string | null;
	itens: CotacaoCompraPublicaItem[];
}

export const cotacoesCompraService = {
	async listar(params: {
		idempresa: string;
		status?: string;
		q?: string;
		page?: number;
		limit?: number;
	}): Promise<ListarCotacoesCompraResponse> {
		const { data } = await api.get<ListarCotacoesCompraResponse>(
			"/cotacoes-compra",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<CotacaoCompra> {
		const { data } = await api.get<CotacaoCompra>(`/cotacoes-compra/${id}`);
		return data;
	},

	async criar(dados: CriarCotacaoCompraData): Promise<CotacaoCompra> {
		const { data } = await api.post<CotacaoCompra>("/cotacoes-compra", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: Omit<CriarCotacaoCompraData, "idempresa">,
	): Promise<CotacaoCompra> {
		const { data } = await api.put<CotacaoCompra>(
			`/cotacoes-compra/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/cotacoes-compra/${id}`);
	},

	async abrir(id: string): Promise<CotacaoCompra> {
		const { data } = await api.post<CotacaoCompra>(
			`/cotacoes-compra/${id}/abrir`,
		);
		return data;
	},

	async encerrar(id: string): Promise<CotacaoCompra> {
		const { data } = await api.post<CotacaoCompra>(
			`/cotacoes-compra/${id}/encerrar`,
		);
		return data;
	},

	async cancelar(id: string): Promise<CotacaoCompra> {
		const { data } = await api.post<CotacaoCompra>(
			`/cotacoes-compra/${id}/cancelar`,
		);
		return data;
	},

	async comparativo(id: string): Promise<ComparativoCotacao> {
		const { data } = await api.get<ComparativoCotacao>(
			`/cotacoes-compra/${id}/comparativo`,
		);
		return data;
	},

	async gerarPedidos(
		id: string,
		itens: Array<{ idcotacaoitem: string; idproposta: string }>,
	) {
		const { data } = await api.post(`/cotacoes-compra/${id}/gerar-pedidos`, {
			itens,
		});
		return data;
	},

	async buscarPublica(token: string): Promise<CotacaoCompraPublica> {
		const { data } = await api.get<CotacaoCompraPublica>(
			`/cotacoes-compra/publico/${token}`,
		);
		return data;
	},

	async enviarProposta(
		token: string,
		dados: {
			nome: string;
			telefone: string;
			itens: Array<{ idcotacaoitem: string; precounitario: number }>;
		},
	) {
		const { data } = await api.post(
			`/cotacoes-compra/publico/${token}/propostas`,
			dados,
		);
		return data;
	},
};
