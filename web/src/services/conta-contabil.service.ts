import { api } from "@/lib/axios";

export interface ContaContabil {
	id: string;
	idempresa: string;
	idcontapai: string | null;
	descricao: string;
	natureza: string | null;
	tipocontacontabil: string | null;
	codigoreduzido: string | null;
	codigocontareferencial: string | null;
	codigoextenso: string | null;
	contaglutinadora: number | null;
	nivelconta: number | null;
	inativo: number | null;
	currenttimemillis: number;
	datacadastro: string;
	dataultimaalteracao: string;
	idusuariocadastro: string;
	idultimousuarioalteracao: string;
	numeronivel1: string | null;
	numeronivel2: string | null;
	numeronivel3: string | null;
	numeronivel4: string | null;
	numeronivel5: string | null;
	numeronivel6: string | null;
	numeronivel7: string | null;
	numeronivel8: string | null;
	numeronivel9: string | null;
}

export interface ListarContasContabeisResponse {
	data: ContaContabil[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarContaContabilData {
	idempresa: string;
	descricao: string;
	natureza?: string | null;
	tipocontacontabil?: string | null;
	codigoreduzido?: string | null;
	codigocontareferencial?: string | null;
	codigoextenso?: string | null;
	contaglutinadora?: number | null;
	nivelconta?: number | null;
	idcontapai?: string | null;
	inativo?: number;
}

export interface AtualizarContaContabilData {
	descricao?: string;
	natureza?: string | null;
	tipocontacontabil?: string | null;
	codigoreduzido?: string | null;
	inativo?: number;
}

export type SituacaoCodigoReduzido = "com" | "sem";

export type ListarContasContabeisParams = {
	idempresa?: string;
	descricao?: string;
	q?: string;
	codigoreduzido?: string;
	codigoextenso?: string;
	natureza?: string;
	tipocontacontabil?: string;
	inativo?: number;
	situacaoCodigo?: SituacaoCodigoReduzido;
	ordenarPor?: string;
	ordem?: "asc" | "desc";
	page?: number;
	limit?: number;
};

export const contaContabilService = {
	async listar(
		params?: ListarContasContabeisParams,
	): Promise<ListarContasContabeisResponse> {
		const { data } = await api.get<ListarContasContabeisResponse>(
			"/conta-contabil",
			{ params },
		);
		return data;
	},

	async buscarProximoCodigoReduzido(
		idempresa: string,
	): Promise<{ codigo: string }> {
		const { data } = await api.get<{ codigo: string }>(
			"/conta-contabil/proximo-codigo-reduzido",
			{ params: { idempresa } },
		);
		return data;
	},

	async buscar(id: string): Promise<ContaContabil> {
		const { data } = await api.get<ContaContabil>(`/conta-contabil/${id}`);
		return data;
	},

	async criar(dados: CriarContaContabilData): Promise<ContaContabil> {
		const { data } = await api.post<ContaContabil>("/conta-contabil", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarContaContabilData,
	): Promise<ContaContabil> {
		const { data } = await api.put<ContaContabil>(
			`/conta-contabil/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/conta-contabil/${id}`);
	},
};
