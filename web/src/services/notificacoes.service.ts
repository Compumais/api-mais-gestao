import { api } from "@/lib/axios";

export interface Notificacao {
	id: string;
	idusuario: string;
	idempresa: string;
	tipo: string;
	idrecurso: string | null;
	titulo: string;
	detalhes: Record<string, unknown> | null;
	lida: boolean;
	criadoem: string;
}

export interface ListarNotificacoesResponse {
	notificacoes: Notificacao[];
	total: number;
}

export interface ListarNotificacoesParams {
	idempresa?: string;
	lida?: boolean;
	limit?: number;
	offset?: number;
}

export interface ContarNaoLidasResponse {
	total: number;
}

export const notificacoesService = {
	async listar(
		params?: ListarNotificacoesParams,
	): Promise<ListarNotificacoesResponse> {
		const { data } = await api.get<ListarNotificacoesResponse>(
			"/notificacoes",
			{ params },
		);
		return data;
	},

	async contarNaoLidas(): Promise<number> {
		const { data } = await api.get<ContarNaoLidasResponse>(
			"/notificacoes/nao-lidas/count",
		);
		return data.total;
	},

	async buscar(id: string): Promise<Notificacao> {
		const { data } = await api.get<Notificacao>(`/notificacoes/${id}`);
		return data;
	},

	async marcarComoLida(id: string): Promise<Notificacao> {
		const { data } = await api.patch<Notificacao>(`/notificacoes/${id}/lido`);
		return data;
	},
};
