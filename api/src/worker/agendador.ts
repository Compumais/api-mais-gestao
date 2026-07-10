import cron, { type ScheduledTask } from "node-cron";
import { executarAlertasVencimento } from "./jobs/alertas-vencimento.js";
import { executarConciliacaoPendente } from "./jobs/conciliacao-pendente.js";
import { executarProcessarAutomacoes } from "./jobs/processar-automacoes.js";
import { executarRelatoriosAutomaticos } from "./jobs/relatorios-automaticos.js";
import { executarSaldoBaixo } from "./jobs/saldo-baixo.js";
import { executarVerificarCiclosPlano } from "./jobs/verificar-ciclos-plano.js";
import { executarSyncInboundInvoices } from "./jobs/sync-inbound-invoices.js";
import { executarJob } from "./executar-job.js";
import {
	liberarLockAgendador,
	tentarAdquirirLockAgendador,
} from "@/repositories/tarefa-execucao-repositories.js";
import {
	LOCK_AGENDADOR_AUTOMACOES,
	LOCK_AGENDADOR_INBOUND_NFE,
	LOCK_AGENDADOR_PRINCIPAL,
} from "./types.js";

let tarefasAgendadas: ScheduledTask[] = [];

async function executarCicloAlertas() {
	const adquiriu = await tentarAdquirirLockAgendador(LOCK_AGENDADOR_PRINCIPAL);
	if (!adquiriu) {
		return;
	}

	const contexto = { agora: new Date() };

	try {
		await executarJob("alerta_vencimento", executarAlertasVencimento, contexto);
		await executarJob("saldo_baixo", executarSaldoBaixo, contexto);
		await executarJob(
			"conciliacao_pendente",
			executarConciliacaoPendente,
			contexto,
		);
		await executarJob(
			"relatorios_automaticos",
			executarRelatoriosAutomaticos,
			contexto,
		);
	} catch (error) {
		console.error("[agendador] Erro no ciclo de alertas:", error);
	} finally {
		await liberarLockAgendador(LOCK_AGENDADOR_PRINCIPAL);
	}
}

async function executarCicloPlanos() {
	const contexto = { agora: new Date() };

	try {
		await executarJob(
			"verificar_ciclos_plano",
			executarVerificarCiclosPlano,
			contexto,
		);
	} catch (error) {
		console.error("[agendador] Erro ao verificar ciclos de plano:", error);
	}
}

async function executarCicloInboundNfe() {
	const adquiriu = await tentarAdquirirLockAgendador(LOCK_AGENDADOR_INBOUND_NFE);
	if (!adquiriu) {
		return;
	}

	const contexto = { agora: new Date() };

	try {
		await executarJob(
			"sync_inbound_nfe",
			executarSyncInboundInvoices,
			contexto,
			null,
			300_000,
		);
	} catch (error) {
		console.error("[agendador] Erro no ciclo inbound NF-e:", error);
	} finally {
		await liberarLockAgendador(LOCK_AGENDADOR_INBOUND_NFE);
	}
}

async function executarCicloAutomacoes() {
	const adquiriu = await tentarAdquirirLockAgendador(LOCK_AGENDADOR_AUTOMACOES);
	if (!adquiriu) {
		return;
	}

	const contexto = { agora: new Date() };

	try {
		await executarJob(
			"processar_automacoes",
			executarProcessarAutomacoes,
			contexto,
			null,
			900_000,
		);
	} catch (error) {
		console.error("[agendador] Erro no ciclo de automações:", error);
	} finally {
		await liberarLockAgendador(LOCK_AGENDADOR_AUTOMACOES);
	}
}

export function iniciarAgendador() {
	if (tarefasAgendadas.length > 0) {
		return;
	}

	const cronAlertas = cron.schedule("*/5 * * * *", () => {
		void executarCicloAlertas();
	});

	const cronPlanos = cron.schedule("0 6 * * *", () => {
		void executarCicloPlanos();
	});

	const cronInboundNfe = cron.schedule("*/10 * * * *", () => {
		void executarCicloInboundNfe();
	});

	const cronAutomacoes = cron.schedule("*/5 * * * *", () => {
		void executarCicloAutomacoes();
	});

	tarefasAgendadas = [cronAlertas, cronPlanos, cronInboundNfe, cronAutomacoes];
	console.log(
		"[agendador] Iniciado — alertas/automações a cada 5 min, ciclos de plano às 06:00, inbound NF-e a cada 10 min",
	);
}

export function pararAgendador() {
	for (const tarefa of tarefasAgendadas) {
		tarefa.stop();
	}
	tarefasAgendadas = [];
}

export const JOBS_DISPONIVEIS = {
	alertasVencimento: () =>
		executarJob(
			"alerta_vencimento",
			executarAlertasVencimento,
			{ agora: new Date() },
		),
	saldoBaixo: () =>
		executarJob("saldo_baixo", executarSaldoBaixo, { agora: new Date() }),
	conciliacaoPendente: () =>
		executarJob(
			"conciliacao_pendente",
			executarConciliacaoPendente,
			{ agora: new Date() },
		),
	relatoriosAutomaticos: () =>
		executarJob(
			"relatorios_automaticos",
			executarRelatoriosAutomaticos,
			{ agora: new Date() },
		),
	verificarCiclosPlano: () =>
		executarJob(
			"verificar_ciclos_plano",
			executarVerificarCiclosPlano,
			{ agora: new Date() },
		),
	syncInboundInvoices: () =>
		executarJob(
			"sync_inbound_nfe",
			executarSyncInboundInvoices,
			{ agora: new Date() },
			null,
			300_000,
		),
	processarAutomacoes: () =>
		executarJob(
			"processar_automacoes",
			executarProcessarAutomacoes,
			{ agora: new Date() },
			null,
			900_000,
		),
} as const;

export type NomeJobManual = keyof typeof JOBS_DISPONIVEIS;
