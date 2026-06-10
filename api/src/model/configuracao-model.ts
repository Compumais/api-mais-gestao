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

export interface NovaConfiguracao {
	idempresa: string;
	notificacoes?: Partial<ConfiguracaoNotificacoes>;
	integracao?: Partial<ConfiguracaoIntegracao>;
	relatorios?: Partial<ConfiguracaoRelatorios>;
	impressao?: Partial<ConfiguracaoImpressao>;
}
