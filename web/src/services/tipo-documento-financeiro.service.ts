import { api } from "@/lib/axios";

export interface TipoDocumentoFinanceiro {
	id: string;
	idempresa: string;
	descricao: string;
	acao: number;
	inativo: number | null;
	integracaixabanco: number | null;
	formapagamentonfe: string | null;
	idplanocontas: string | null;
	aprazo: number;
	prazodias: number | null;
}

export interface ListarTiposDocumentoFinanceiroResponse {
	data: TipoDocumentoFinanceiro[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const tipoDocumentoFinanceiroService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		inativo?: number;
		descricao?: string;
	}): Promise<ListarTiposDocumentoFinanceiroResponse> {
		const { data } = await api.get<ListarTiposDocumentoFinanceiroResponse>(
			"/tipos-documento-financeiro",
			{ params },
		);
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		inativo?: number;
		descricao?: string;
	}): Promise<TipoDocumentoFinanceiro[]> {
		const limite = 100;
		let pagina = 1;
		const registros: TipoDocumentoFinanceiro[] = [];

		while (true) {
			const resposta = await tipoDocumentoFinanceiroService.listar({
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

	async popularPadrao(idempresa: string): Promise<TipoDocumentoFinanceiro[]> {
		const { data } = await api.post<{
			criados: number;
			data: TipoDocumentoFinanceiro[];
		}>("/tipos-documento-financeiro/popular-padrao", { idempresa });
		return data.data;
	},

	async criar(dados: {
		idempresa: string;
		descricao: string;
		acao?: number;
		formapagamentonfe?: string | null;
		idplanocontas?: string | null;
		aprazo?: number;
		prazodias?: number | null;
		integracaixabanco?: number;
		inativo?: number;
	}): Promise<TipoDocumentoFinanceiro> {
		const { data } = await api.post<TipoDocumentoFinanceiro>(
			"/tipos-documento-financeiro",
			{
				acao: 1,
				inativo: 0,
				integracaixabanco: 0,
				aprazo: 0,
				...dados,
			},
		);
		return data;
	},

	async atualizar(
		id: string,
		dados: Partial<{
			descricao: string;
			formapagamentonfe: string | null;
			idplanocontas: string | null;
			aprazo: number;
			prazodias: number | null;
			integracaixabanco: number;
			inativo: number;
		}>,
	): Promise<TipoDocumentoFinanceiro> {
		const { data } = await api.put<TipoDocumentoFinanceiro>(
			`/tipos-documento-financeiro/${id}`,
			dados,
		);
		return data;
	},

	async buscar(id: string): Promise<TipoDocumentoFinanceiro> {
		const { data } = await api.get<TipoDocumentoFinanceiro>(
			`/tipos-documento-financeiro/${id}`,
		);
		return data;
	},
};
