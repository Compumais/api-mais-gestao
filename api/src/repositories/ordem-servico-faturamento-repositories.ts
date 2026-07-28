import { and, desc, eq } from "drizzle-orm";
import type { NovoOrdemServicoFaturamento } from "@/model/ordem-servico-faturamento-model";
import { ordemservicofaturamento } from "@/repositories/schema.js";
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
		.select()
		.from(ordemservicofaturamento)
		.where(
			and(
				eq(ordemservicofaturamento.idordemservico, idordemservico),
				eq(ordemservicofaturamento.idempresa, idempresa),
			),
		)
		.orderBy(desc(ordemservicofaturamento.datacriacao));
}

export async function buscarFaturamentoNfeAtivoPorOrdemServico(
	idordemservico: string,
	idempresa: string,
) {
	const registros = await listarFaturamentosPorOrdemServico(
		idordemservico,
		idempresa,
	);
	return registros.find((item) => item.idnotafiscal) ?? null;
}
