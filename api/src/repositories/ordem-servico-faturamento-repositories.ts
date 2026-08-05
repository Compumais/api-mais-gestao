import { and, desc, eq, getTableColumns } from "drizzle-orm";
import type { NovoOrdemServicoFaturamento } from "@/model/ordem-servico-faturamento-model";
import { notafiscal, ordemservicofaturamento } from "@/repositories/schema.js";
import { db } from "./connection";

export async function criarOrdemServicoFaturamento(
	dados: NovoOrdemServicoFaturamento,
) {
	const [registro] = await db
		.insert(ordemservicofaturamento)
		.values(dados)
		.returning();

	return registro;
}

export async function listarFaturamentosPorOrdemServico(
	idordemservico: string,
	idempresa: string,
) {
	return db
		.select({
			...getTableColumns(ordemservicofaturamento),
			modelonotafiscal: notafiscal.modelo,
			statusnotafiscal: notafiscal.status,
		})
		.from(ordemservicofaturamento)
		.leftJoin(
			notafiscal,
			eq(ordemservicofaturamento.idnotafiscal, notafiscal.id),
		)
		.where(
			and(
				eq(ordemservicofaturamento.idordemservico, idordemservico),
				eq(ordemservicofaturamento.idempresa, idempresa),
			),
		)
		.orderBy(desc(ordemservicofaturamento.datacriacao));
}

export async function buscarFaturamentoFiscalPorModeloOrdemServico(
	idordemservico: string,
	idempresa: string,
	modelo: string,
) {
	const registros = await listarFaturamentosPorOrdemServico(
		idordemservico,
		idempresa,
	);
	return (
		registros.find(
			(item) => item.idnotafiscal && item.modelonotafiscal === modelo,
		) ?? null
	);
}

export async function buscarFaturamentoNfeAtivoPorOrdemServico(
	idordemservico: string,
	idempresa: string,
) {
	return buscarFaturamentoFiscalPorModeloOrdemServico(
		idordemservico,
		idempresa,
		"55",
	);
}
