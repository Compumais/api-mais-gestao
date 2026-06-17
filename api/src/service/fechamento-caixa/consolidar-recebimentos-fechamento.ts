import { eq } from "drizzle-orm";
import type { FechamentoCaixa } from "@/model/fechamento-caixa-model.js";
import {
	buscarContaCorrenteCaixaPadrao,
	criarContaCorrenteCaixaPadrao,
} from "@/repositories/conta-corrente-repositories.js";
import { db } from "@/repositories/connection.js";
import { buscarPlanoContasPorCodigo } from "@/repositories/plano-contas-repositories.js";
import { fechamentopdv } from "@/repositories/schema.js";
import { inserirLancamentoCaixa } from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import { calcularTotaisTurnoCaixa } from "@/service/fechamento-caixa/calcular-totais-turno-caixa.js";
import {
	CODIGO_PLANO_VENDAS_DINHEIRO,
	CODIGO_PLANO_VENDAS_PIX,
	formatarDataIso,
} from "@/util/recebimentos-venda-util.js";

export const STATUS_CAIXA_FECHADO = 1;

type TransacaoDb = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ResultadoConsolidacao =
	| { success: true; lancamentos: number; skipped: boolean }
	| { success: false; mensagem: string };

function documentoFechamento(fechamentoId: number): string {
	return `fechamento:${fechamentoId}`;
}

export async function consolidarRecebimentosFechamentoCaixa({
	fechamento,
	idusuario,
	tx,
}: {
	fechamento: FechamentoCaixa;
	idusuario: string;
	tx: TransacaoDb;
}): Promise<ResultadoConsolidacao> {
	if (fechamento.financeiroconsolidadoem) {
		return { success: true, lancamentos: 0, skipped: true };
	}

	const totais = await calcularTotaisTurnoCaixa(fechamento);
	const lancamentosPlanejados: Array<{
		valor: number;
		codigoPlanoContas: string;
		historico: string;
	}> = [];

	if (totais.dinheiro > 0) {
		lancamentosPlanejados.push({
			valor: totais.dinheiro,
			codigoPlanoContas: CODIGO_PLANO_VENDAS_DINHEIRO,
			historico: `Fechamento PDV #${fechamento.pdv} - Dinheiro (${totais.qtdVendas} venda(s))`,
		});
	}

	if (totais.pix > 0) {
		lancamentosPlanejados.push({
			valor: totais.pix,
			codigoPlanoContas: CODIGO_PLANO_VENDAS_PIX,
			historico: `Fechamento PDV #${fechamento.pdv} - PIX (${totais.qtdVendas} venda(s))`,
		});
	}

	if (lancamentosPlanejados.length === 0) {
		await tx
			.update(fechamentopdv)
			.set({ financeiroconsolidadoem: new Date() })
			.where(eq(fechamentopdv.id, fechamento.id));

		return { success: true, lancamentos: 0, skipped: false };
	}

	let caixa = await buscarContaCorrenteCaixaPadrao(fechamento.idempresa);

	if (!caixa) {
		caixa = await criarContaCorrenteCaixaPadrao(fechamento.idempresa);
	}

	if (!caixa) {
		return {
			success: false,
			mensagem: "Conta corrente Caixa não encontrada",
		};
	}

	const planosPorCodigo = new Map<string, string>();

	for (const lancamento of lancamentosPlanejados) {
		const plano = await buscarPlanoContasPorCodigo(
			fechamento.idempresa,
			lancamento.codigoPlanoContas,
		);

		if (!plano) {
			return {
				success: false,
				mensagem: `Conta do plano de contas não encontrada: ${lancamento.codigoPlanoContas}`,
			};
		}

		planosPorCodigo.set(lancamento.codigoPlanoContas, plano.id);
	}

	const dataHoje = formatarDataIso(new Date());
	const documento = documentoFechamento(fechamento.id);

	for (const lancamento of lancamentosPlanejados) {
		const idplanocontas = planosPorCodigo.get(lancamento.codigoPlanoContas);

		if (!idplanocontas) {
			return {
				success: false,
				mensagem: `Plano de contas não resolvido: ${lancamento.codigoPlanoContas}`,
			};
		}

		await inserirLancamentoCaixa(tx, {
			idcontacorrente: caixa.id,
			idusuario,
			idplanocontas,
			valor: lancamento.valor,
			historico: lancamento.historico,
			documento,
			datahora: dataHoje,
		});
	}

	await tx
		.update(fechamentopdv)
		.set({ financeiroconsolidadoem: new Date() })
		.where(eq(fechamentopdv.id, fechamento.id));

	return {
		success: true,
		lancamentos: lancamentosPlanejados.length,
		skipped: false,
	};
}
