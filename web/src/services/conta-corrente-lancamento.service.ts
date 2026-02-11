import { api } from "@/lib/axios";

export interface ContaCorrenteLancamento {
	id: string;
	idcontacorrente: string;
	datahora?: string | null;
	tipo?: string | null;
	valor?: string | null;
	saldoanterior?: string | null;
	saldoatual?: string | null;
	historico?: string | null;
	idusuario?: string | null;
	idplanocontas?: string | null;
	evento?: number | null;
	debito?: string | null;
	documento?: string | null;
	dataconciliacao?: string | null;
	// Relacionamentos
	planocontasnome?: string | null;
	planocontascodigo?: string | null;
	contacorrentedescricao?: string | null;
	contacorrenteagencia?: string | null;
}

export interface ListarContaCorrenteLancamentosResponse {
	data: ContaCorrenteLancamento[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarContaCorrenteLancamentoData {
	idcontacorrente: string;
	datahora?: string;
	tipo?: "E" | "S" | "C" | "D";
	valor: string;
	historico?: string;
	idplanocontas?: string;
	evento?: number;
	debito?: string;
	documento?: string;
	dataconciliacao?: string;
}

export interface AtualizarContaCorrenteLancamentoData {
	datahora?: string;
	tipo?: "E" | "S" | "C" | "D";
	valor?: string;
	historico?: string;
	idplanocontas?: string;
	evento?: number;
	debito?: string;
	documento?: string;
	dataconciliacao?: string;
}

export const contaCorrenteLancamentoService = {
	async listar(params?: {
		idcontacorrente: string;
		page?: number;
		limit?: number;
	}): Promise<ListarContaCorrenteLancamentosResponse> {
		const { data } = await api.get<ListarContaCorrenteLancamentosResponse>(
			"/conta-corrente-lancamentos",
			{
				params,
			},
		);
		return data;
	},

	async buscar(id: string): Promise<ContaCorrenteLancamento> {
		const { data } = await api.get<ContaCorrenteLancamento>(
			`/conta-corrente-lancamentos/${id}`,
		);
		return data;
	},

	async criar(
		dados: CriarContaCorrenteLancamentoData,
	): Promise<ContaCorrenteLancamento> {
		const { data } = await api.post<ContaCorrenteLancamento>(
			"/conta-corrente-lancamentos",
			dados,
		);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarContaCorrenteLancamentoData,
	): Promise<ContaCorrenteLancamento> {
		const { data } = await api.put<ContaCorrenteLancamento>(
			`/conta-corrente-lancamentos/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/conta-corrente-lancamentos/${id}`);
	},
};

