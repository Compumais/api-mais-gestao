import { api } from "@/lib/axios";

export interface ConfiguracaoNotificacoes {
	alertasFinanceiros: {
		vencimentoContas: { habilitado: boolean; diasAntes: number };
		saldoBaixo: { habilitado: boolean; valorMinimo: string };
		transferenciasAcimaValor: { habilitado: boolean; valorLimite: string };
		conciliacoesPendentes: { habilitado: boolean; diasPendentes: number };
	};
	notificacoesEmail: {
		relatoriosAutomaticos: {
			habilitado: boolean;
			frequencia: "diario" | "semanal" | "mensal" | null;
			horario: string;
		};
		resumoMovimentacoes: {
			habilitado: boolean;
			frequencia: "diario" | "semanal" | "mensal" | null;
		};
		alertasVencimento: { habilitado: boolean; diasAntes: number };
	};
}

export interface ConfiguracaoIntegracao {
	apis: {
		chaves: Array<{
			id: string;
			nome: string;
			chave: string;
			criadoEm: string;
			ultimoUso: string | null;
			ativo: boolean;
		}>;
	};
	webhooks: Array<{
		id: string;
		url: string;
		eventos: string[];
		ativo: boolean;
		criadoEm: string;
	}>;
	integracoesBancos: {
		habilitado: boolean;
		provedor: string | null;
		configuracoes: Record<string, unknown>;
	};
	exportacao: {
		formatoPadrao: "csv" | "excel" | "pdf";
		incluirCabecalho: boolean;
		separador: string;
	};
	backup: {
		habilitado: boolean;
		frequencia: "diario" | "semanal" | "mensal" | null;
		horario: string;
		manterBackups: number;
	};
}

export interface ConfiguracaoRelatorios {
	templates: Array<{
		id: string;
		nome: string;
		tipo: string;
		configuracoes: Record<string, unknown>;
	}>;
	padroes: {
		periodo: "mes" | "trimestre" | "semestre" | "ano" | "personalizado";
		agrupamentos: string[];
		filtros: Record<string, unknown>;
	};
}

export interface ConfiguracaoImpressao {
	cabecalho: { texto: string | null; logo: string | null };
	rodape: { texto: string | null };
	documentosFiscais: {
		incluirLogo: boolean;
		incluirDadosEmpresa: boolean;
		dadosEmpresa: {
			razaoSocial: boolean;
			cnpj: boolean;
			endereco: boolean;
			contato: boolean;
		};
	};
}

export interface Configuracao {
	id: string;
	idempresa: string;
	notificacoes: ConfiguracaoNotificacoes;
	integracao: ConfiguracaoIntegracao;
	relatorios: ConfiguracaoRelatorios;
	impressao: ConfiguracaoImpressao;
	criadoem: string;
	atualizadoem: string;
}

export interface CriarChaveApiData {
	nome: string;
}

export interface CriarWebhookData {
	url: string;
	eventos: string[];
}

export interface AtualizarWebhookData {
	url?: string;
	eventos?: string[];
	ativo?: boolean;
}

export const configuracaoService = {
	async buscar(idempresa: string): Promise<Configuracao> {
		const { data } = await api.get<Configuracao>("/configuracoes", {
			params: { idempresa },
		});
		return data;
	},

	async atualizar(
		idempresa: string,
		dados: Partial<{
			notificacoes: Partial<ConfiguracaoNotificacoes>;
			integracao: Partial<ConfiguracaoIntegracao>;
			relatorios: Partial<ConfiguracaoRelatorios>;
			impressao: Partial<ConfiguracaoImpressao>;
		}>,
	): Promise<Configuracao> {
		const { data } = await api.put<Configuracao>("/configuracoes", {
			idempresa,
			...dados,
		});
		return data;
	},

	async atualizarSecao(
		idempresa: string,
		secao: "notificacoes" | "integracao" | "relatorios" | "impressao",
		dados: unknown,
	): Promise<Configuracao> {
		const { data } = await api.patch<Configuracao>(
			`/configuracoes/${idempresa}/secao/${secao}`,
			dados,
		);
		return data;
	},

	async criarChaveApi(
		idempresa: string,
		dados: CriarChaveApiData,
	): Promise<{ chave: string }> {
		const { data } = await api.post<{ chave: string }>(
			`/configuracoes/${idempresa}/chaves-api`,
			dados,
		);
		return data;
	},

	async deletarChaveApi(idempresa: string, chaveId: string): Promise<void> {
		await api.delete(`/configuracoes/${idempresa}/chaves-api/${chaveId}`);
	},

	async criarWebhook(
		idempresa: string,
		dados: CriarWebhookData,
	): Promise<ConfiguracaoIntegracao["webhooks"][0]> {
		const { data } = await api.post<ConfiguracaoIntegracao["webhooks"][0]>(
			`/configuracoes/${idempresa}/webhooks`,
			dados,
		);
		return data;
	},

	async atualizarWebhook(
		idempresa: string,
		webhookId: string,
		dados: AtualizarWebhookData,
	): Promise<ConfiguracaoIntegracao["webhooks"][0]> {
		const { data } = await api.put<ConfiguracaoIntegracao["webhooks"][0]>(
			`/configuracoes/${idempresa}/webhooks/${webhookId}`,
			dados,
		);
		return data;
	},

	async deletarWebhook(idempresa: string, webhookId: string): Promise<void> {
		await api.delete(`/configuracoes/${idempresa}/webhooks/${webhookId}`);
	},
};
