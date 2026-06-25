import { eq, sql } from "drizzle-orm";
import * as schema from "../../../drizzle/schema.js";
import { db } from "@/repositories/connection.js";
import { criarNotificacaoAgendadaService } from "@/service/notificacoes/criar-notificacao-agendada.js";
import { listarEmpresasComConfiguracaoNotificacoes } from "@/worker/repositories/empresas-configuracao.js";
import type { JobContext, JobResult } from "@/worker/types.js";
import { formatarDataIso } from "@/worker/util/configuracao-notificacoes.js";

async function calcularSaldoTotalEmpresa(idempresa: string): Promise<number> {
	const contas = await db
		.select({ id: schema.contacorrente.id })
		.from(schema.contacorrente)
		.where(eq(schema.contacorrente.idempresa, idempresa));

	let total = 0;

	for (const conta of contas) {
		const [ultimo] = await db
			.select({ saldoatual: schema.contacorrentelancamento.saldoatual })
			.from(schema.contacorrentelancamento)
			.where(eq(schema.contacorrentelancamento.idcontacorrente, conta.id))
			.orderBy(
				sql`${schema.contacorrentelancamento.datahora} DESC NULLS LAST`,
				sql`${schema.contacorrentelancamento.currenttimemillis} DESC NULLS LAST`,
			)
			.limit(1);

		total += Number(ultimo?.saldoatual ?? 0);
	}

	return total;
}

function formatarMoeda(valor: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(valor);
}

export async function executarSaldoBaixo(
	contexto: JobContext,
): Promise<JobResult> {
	const empresas = await listarEmpresasComConfiguracaoNotificacoes();
	let processadas = 0;
	let notificacoes = 0;
	let ignoradas = 0;

	const dataChave = formatarDataIso(contexto.agora);

	for (const { idempresa, notificacoes: config } of empresas) {
		const alerta = config.alertasFinanceiros.saldoBaixo;

		if (!alerta.habilitado) {
			ignoradas++;
			continue;
		}

		const valorMinimo = Number(alerta.valorMinimo);
		if (!Number.isFinite(valorMinimo) || valorMinimo <= 0) {
			ignoradas++;
			continue;
		}

		processadas++;
		const saldoTotal = await calcularSaldoTotalEmpresa(idempresa);

		if (saldoTotal >= valorMinimo) {
			ignoradas++;
			continue;
		}

		const criadas = await criarNotificacaoAgendadaService({
			tipo: "alerta_saldo_baixo",
			idempresa,
			idrecurso: `saldo-baixo:${idempresa}:${dataChave}`,
			titulo: `Saldo baixo: ${formatarMoeda(saldoTotal)} (mínimo ${formatarMoeda(valorMinimo)})`,
			detalhes: {
				saldoTotal,
				valorMinimo,
				data: dataChave,
			},
		});

		notificacoes += criadas;
	}

	return { processadas, notificacoes, ignoradas };
}
