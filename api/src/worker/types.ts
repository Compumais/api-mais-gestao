import type { ConfiguracaoNotificacoes } from "@/model/configuracao-model.js";

export type TipoTarefaExecucao =
	| "alerta_vencimento"
	| "saldo_baixo"
	| "conciliacao_pendente"
	| "relatorios_automaticos"
	| "verificar_ciclos_plano"
	| "sync_inbound_nfe"
	| "processar_automacoes"
	| `automacao:${string}`;

export type JobContext = {
	agora: Date;
};

export type JobResult = {
	processadas: number;
	notificacoes: number;
	ignoradas: number;
	detalhes?: Record<string, unknown>;
};

export type JobHandler = (contexto: JobContext) => Promise<JobResult>;

export const LOCK_AGENDADOR_PRINCIPAL = 871_234_001;
export const LOCK_AGENDADOR_INBOUND_NFE = 871_234_002;
export const LOCK_AGENDADOR_AUTOMACOES = 871_234_003;

export const CONFIGURACAO_NOTIFICACOES_PADRAO: ConfiguracaoNotificacoes = {
	alertasFinanceiros: {
		vencimentoContas: { habilitado: false, diasAntes: 7 },
		saldoBaixo: { habilitado: false, valorMinimo: "0" },
		transferenciasAcimaValor: { habilitado: false, valorLimite: "0" },
		conciliacoesPendentes: { habilitado: false, diasPendentes: 30 },
	},
	notificacoesEmail: {
		relatoriosAutomaticos: {
			habilitado: false,
			frequencia: null,
			horario: "08:00",
		},
		resumoMovimentacoes: {
			habilitado: false,
			frequencia: null,
		},
		alertasVencimento: { habilitado: false, diasAntes: 7 },
	},
};
