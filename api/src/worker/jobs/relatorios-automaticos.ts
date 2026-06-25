import { buscarDadosFluxoCaixa } from "@/repositories/relatorios-repositories.js";
import { criarNotificacaoAgendadaService } from "@/service/notificacoes/criar-notificacao-agendada.js";
import { listarEmpresasComConfiguracaoNotificacoes } from "@/worker/repositories/empresas-configuracao.js";
import type { JobContext, JobResult } from "@/worker/types.js";
import {
	adicionarDias,
	deveExecutarNoHorario,
	formatarDataIso,
	type FrequenciaAgendamento,
} from "@/worker/util/configuracao-notificacoes.js";

function formatarMoeda(valor: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(valor);
}

function calcularPeriodo(
	agora: Date,
	frequencia: FrequenciaAgendamento,
): { inicio: string; fim: string } {
	const fim = formatarDataIso(adicionarDias(agora, -1));

	if (frequencia === "diario") {
		return { inicio: fim, fim };
	}

	if (frequencia === "semanal") {
		return {
			inicio: formatarDataIso(adicionarDias(agora, -7)),
			fim,
		};
	}

	return {
		inicio: formatarDataIso(adicionarDias(agora, -30)),
		fim,
	};
}

export async function executarRelatoriosAutomaticos(
	contexto: JobContext,
): Promise<JobResult> {
	const empresas = await listarEmpresasComConfiguracaoNotificacoes();
	let processadas = 0;
	let notificacoes = 0;
	let ignoradas = 0;

	const dataChave = formatarDataIso(contexto.agora);

	for (const { idempresa, notificacoes: config } of empresas) {
		const relatorio = config.notificacoesEmail.relatoriosAutomaticos;

		if (!relatorio.habilitado || !relatorio.frequencia) {
			ignoradas++;
			continue;
		}

		if (
			!deveExecutarNoHorario(
				contexto.agora,
				relatorio.frequencia,
				relatorio.horario,
			)
		) {
			ignoradas++;
			continue;
		}

		processadas++;
		const periodo = calcularPeriodo(contexto.agora, relatorio.frequencia);

		const dados = await buscarDadosFluxoCaixa({
			idempresa,
			dataInicio: periodo.inicio,
			dataFim: periodo.fim,
		});

		const totalEntradas = dados.reduce((acc, item) => acc + item.entradas, 0);
		const totalSaidas = dados.reduce((acc, item) => acc + item.saidas, 0);
		const saldo = totalEntradas - totalSaidas;

		const criadas = await criarNotificacaoAgendadaService({
			tipo: "relatorio_automatico",
			idempresa,
			idrecurso: `relatorio:${idempresa}:${relatorio.frequencia}:${dataChave}`,
			titulo: `Relatório de fluxo de caixa (${relatorio.frequencia}) disponível`,
			detalhes: {
				frequencia: relatorio.frequencia,
				periodo,
				totalEntradas,
				totalSaidas,
				saldo,
				resumo: `Entradas ${formatarMoeda(totalEntradas)}, saídas ${formatarMoeda(totalSaidas)}, saldo ${formatarMoeda(saldo)}`,
				link: "/relatorios/fluxo-caixa",
			},
		});

		notificacoes += criadas;
	}

	return { processadas, notificacoes, ignoradas };
}
