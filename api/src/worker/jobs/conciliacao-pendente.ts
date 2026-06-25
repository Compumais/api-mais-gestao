import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/repositories/connection.js";
import { criarNotificacaoAgendadaService } from "@/service/notificacoes/criar-notificacao-agendada.js";
import { listarEmpresasComConfiguracaoNotificacoes } from "@/worker/repositories/empresas-configuracao.js";
import type { JobContext, JobResult } from "@/worker/types.js";
import {
	adicionarDias,
	formatarDataIso,
} from "@/worker/util/configuracao-notificacoes.js";
import * as schema from "../../../drizzle/schema.js";

export async function executarConciliacaoPendente(
	contexto: JobContext,
): Promise<JobResult> {
	const empresas = await listarEmpresasComConfiguracaoNotificacoes();
	let processadas = 0;
	let notificacoes = 0;
	let ignoradas = 0;

	for (const { idempresa, notificacoes: config } of empresas) {
		const alerta = config.alertasFinanceiros.conciliacoesPendentes;

		if (!alerta.habilitado) {
			ignoradas++;
			continue;
		}

		const diasPendentes = alerta.diasPendentes;
		if (diasPendentes <= 0) {
			ignoradas++;
			continue;
		}

		const dataLimite = formatarDataIso(
			adicionarDias(contexto.agora, -diasPendentes),
		);

		const lancamentos = await db
			.select({
				id: schema.contacorrentelancamento.id,
				datahora: schema.contacorrentelancamento.datahora,
				historico: schema.contacorrentelancamento.historico,
			})
			.from(schema.contacorrentelancamento)
			.innerJoin(
				schema.contacorrente,
				eq(
					schema.contacorrentelancamento.idcontacorrente,
					schema.contacorrente.id,
				),
			)
			.where(
				and(
					eq(schema.contacorrente.idempresa, idempresa),
					isNull(schema.contacorrentelancamento.dataconciliacao),
					lte(schema.contacorrentelancamento.datahora, dataLimite),
				),
			);

		if (lancamentos.length === 0) {
			ignoradas++;
			continue;
		}

		processadas++;
		const criadas = await criarNotificacaoAgendadaService({
			tipo: "alerta_conciliacao",
			idempresa,
			idrecurso: `conciliacao:${idempresa}:${dataLimite}`,
			titulo: `${lancamentos.length} lançamento(s) aguardando conciliação há mais de ${diasPendentes} dias`,
			detalhes: {
				quantidade: lancamentos.length,
				diasPendentes,
				dataLimite,
			},
		});

		notificacoes += criadas;
	}

	return { processadas, notificacoes, ignoradas };
}
