import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/repositories/connection.js";
import { criarNotificacaoAgendadaService } from "@/service/notificacoes/criar-notificacao-agendada.js";
import { listarEmpresasComConfiguracaoNotificacoes } from "@/worker/repositories/empresas-configuracao.js";
import type { JobContext, JobResult } from "@/worker/types.js";
import {
	adicionarDias,
	formatarDataIso,
} from "@/worker/util/configuracao-notificacoes.js";
import * as schema from "../../../drizzle/schema.js";

export async function executarAlertasVencimento(
	contexto: JobContext,
): Promise<JobResult> {
	const empresas = await listarEmpresasComConfiguracaoNotificacoes();
	let processadas = 0;
	let notificacoes = 0;
	let ignoradas = 0;

	for (const { idempresa, notificacoes: config } of empresas) {
		const alertaInApp = config.alertasFinanceiros.vencimentoContas;
		const alertaEmail = config.notificacoesEmail.alertasVencimento;

		if (!alertaInApp.habilitado && !alertaEmail.habilitado) {
			ignoradas++;
			continue;
		}

		const diasAntes = Math.max(
			alertaInApp.habilitado ? alertaInApp.diasAntes : 0,
			alertaEmail.habilitado ? alertaEmail.diasAntes : 0,
		);

		if (diasAntes <= 0) {
			ignoradas++;
			continue;
		}

		const dataLimite = formatarDataIso(
			adicionarDias(contexto.agora, diasAntes),
		);
		const hoje = formatarDataIso(contexto.agora);

		const titulos = await db
			.select({
				id: schema.financeiro.id,
				tipo: schema.financeiro.tipo,
				vencimento: schema.financeiro.vencimento,
				saldo: schema.financeiro.saldo,
				historico: schema.financeiro.historico,
			})
			.from(schema.financeiro)
			.where(
				and(
					eq(schema.financeiro.idempresa, idempresa),
					eq(schema.financeiro.status, "A"),
					gte(schema.financeiro.vencimento, hoje),
					lte(schema.financeiro.vencimento, dataLimite),
				),
			);

		for (const titulo of titulos) {
			processadas++;
			const tipoLabel = titulo.tipo === "P" ? "pagar" : "receber";
			const valor = Number(titulo.saldo ?? 0);
			const criadas = await criarNotificacaoAgendadaService({
				tipo: "alerta_vencimento",
				idempresa,
				idrecurso: `vencimento:${titulo.id}`,
				titulo: `Conta a ${tipoLabel} vence em ${titulo.vencimento}`,
				detalhes: {
					idfinanceiro: titulo.id,
					tipo: titulo.tipo,
					vencimento: titulo.vencimento,
					valor,
					historico: titulo.historico,
				},
			});

			if (criadas > 0) {
				notificacoes += criadas;
			} else {
				ignoradas++;
			}
		}
	}

	return { processadas, notificacoes, ignoradas };
}
