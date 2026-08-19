import { api } from "@/lib/axios";

export type DominioIntegracao = {
	id: string;
	idempresa: string;
	habilitado: boolean;
	boxefile: boolean;
	chavecontadorMascarada: string | null;
	chaveConfigurada: boolean;
	integrationKeyConfigurada: boolean;
	nomeescritorio: string | null;
	nomecliente: string | null;
	cnpjcliente: string | null;
	ultimoerro: string | null;
	ativadoem: string | null;
	criadoem: string;
	atualizadoem: string;
};

export type DominioEnvio = {
	id: string;
	idempresa: string;
	idnotafiscal: string;
	tipo: string;
	status: string;
	idloteapi: string | null;
	tentativas: number;
	proximatentativa: string | null;
	mensagemretorno: string | null;
	criadoem: string;
	atualizadoem: string;
	chavenfe: string | null;
	modelo: string | null;
	numeronotafiscal: string | null;
};

export type ListarDominioEnviosResposta = {
	data: DominioEnvio[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type AtivarDominioData = {
	idempresa: string;
	chavecontador: string;
	boxefile?: boolean;
};

export type SalvarDominioData = {
	idempresa: string;
	habilitado?: boolean;
	boxefile?: boolean;
	chavecontador?: string | null;
};

export const dominioService = {
	async buscar(idempresa: string): Promise<DominioIntegracao | null> {
		const { data } = await api.get<DominioIntegracao | null>(
			"/dominio/integracao",
			{ params: { idempresa } },
		);
		return data;
	},

	async salvar(dados: SalvarDominioData): Promise<DominioIntegracao> {
		const { data } = await api.put<DominioIntegracao>(
			"/dominio/integracao",
			dados,
		);
		return data;
	},

	async ativar(dados: AtivarDominioData): Promise<DominioIntegracao> {
		const { data } = await api.post<DominioIntegracao>(
			"/dominio/integracao/ativar",
			dados,
		);
		return data;
	},

	async listarEnvios(
		idempresa: string,
		page = 1,
		limit = 10,
	): Promise<ListarDominioEnviosResposta> {
		const { data } = await api.get<ListarDominioEnviosResposta>(
			"/dominio/envios",
			{ params: { idempresa, page, limit } },
		);
		return data;
	},

	async reenviar(id: string, idempresa: string): Promise<DominioEnvio> {
		const { data } = await api.post<DominioEnvio>(
			`/dominio/envios/${id}/reenviar`,
			{ idempresa },
		);
		return data;
	},
};
