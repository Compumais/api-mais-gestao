import { api } from "@/lib/axios";

export type StatusRegraFiscal =
	| "rascunho"
	| "pendente_revisao"
	| "validado"
	| "incompativel"
	| "desativado";

export interface RegraFiscal {
	id: string;
	ruleid: string;
	descricao: string;
	prioridade: number;
	vigenciainicio: string;
	vigenciafim: string | null;
	condicoes: Record<string, unknown>;
	resultado: Record<string, unknown>;
	fontes: unknown[];
	status: StatusRegraFiscal;
	versao: number;
	idempresa: string | null;
	validadoem: string | null;
	validadopor: string | null;
}

export interface ListarRegrasFiscaisResponse {
	data: RegraFiscal[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarRegraFiscalData {
	ruleid: string;
	descricao: string;
	prioridade?: number;
	vigenciainicio: string;
	vigenciafim?: string | null;
	condicoes: Record<string, unknown>;
	resultado: Record<string, unknown>;
	fontes: unknown[];
	status?: StatusRegraFiscal;
	idempresa?: string | null;
}

export const regrasFiscaisService = {
	async listar(params: {
		page?: number;
		limit?: number;
		busca?: string;
		status?: string;
	}): Promise<ListarRegrasFiscaisResponse> {
		const { data } = await api.get<ListarRegrasFiscaisResponse>(
			"/regras-fiscais",
			{ params },
		);
		return data;
	},

	async criar(dados: CriarRegraFiscalData): Promise<RegraFiscal> {
		const { data } = await api.post<RegraFiscal>("/regras-fiscais", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: Partial<CriarRegraFiscalData>,
	): Promise<RegraFiscal> {
		const { data } = await api.put<RegraFiscal>(`/regras-fiscais/${id}`, dados);
		return data;
	},

	async validar(id: string): Promise<RegraFiscal> {
		const { data } = await api.post<RegraFiscal>(`/regras-fiscais/${id}/validar`);
		return data;
	},

	async rollback(id: string, versao: number): Promise<RegraFiscal> {
		const { data } = await api.post<RegraFiscal>(
			`/regras-fiscais/${id}/rollback`,
			{ versao },
		);
		return data;
	},

	async historico(id: string): Promise<{ data: Array<{ versao: number }> }> {
		const { data } = await api.get<{ data: Array<{ versao: number }> }>(
			`/regras-fiscais/${id}/historico`,
		);
		return data;
	},
};
