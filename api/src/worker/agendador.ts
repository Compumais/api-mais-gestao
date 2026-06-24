import cron, { type ScheduledTask } from "node-cron";
import { executarAlertasVencimento } from "./jobs/alertas-vencimento.js";
import { executarConciliacaoPendente } from "./jobs/conciliacao-pendente.js";
import { executarRelatoriosAutomaticos } from "./jobs/relatorios-automaticos.js";
import { executarSaldoBaixo } from "./jobs/saldo-baixo.js";
import { executarVerificarCiclosPlano } from "./jobs/verificar-ciclos-plano.js";
import { executarJob } from "./executar-job.js";
import {
	liberarLockAgendador,
	tentarAdquirirLockAgendador,
} from "@/repositories/tarefa-execucao-repositories.js";
import { LOCK_AGENDADOR_PRINCIPAL } from "./types.js";

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

	tarefasAgendadas = [cronAlertas, cronPlanos];
	console.log(
		"[agendador] Iniciado — alertas a cada 5 min, ciclos de plano às 06:00",
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
} as const;

export type NomeJobManual = keyof typeof JOBS_DISPONIVEIS;
