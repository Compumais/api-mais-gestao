import { and, desc, eq } from "drizzle-orm";
import type { NovoOrdemServicoItemLote } from "@/model/ordem-servico-item-lote-model";
import { ordemservicoitemlote } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarOrdemServicoItemLotePorId(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(ordemservicoitemlote)
		.where(
			and(
				eq(ordemservicoitemlote.id, id),
				eq(ordemservicoitemlote.idempresa, idempresa),
			),
		);

	return registro;
}

export async function criarOrdemServicoItemLote(
	dados: NovoOrdemServicoItemLote,
) {
	const [registro] = await db
		.insert(ordemservicoitemlote)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarOrdemServicoItemLote(
	id: string,
	idempresa: string,
	dados: Partial<NovoOrdemServicoItemLote>,
) {
	const [registro] = await db
		.update(ordemservicoitemlote)
		.set({
			...dados,
			dataalteracao: new Date().toISOString(),
		})
		.where(
			and(
				eq(ordemservicoitemlote.id, id),
				eq(ordemservicoitemlote.idempresa, idempresa),
			),
		)
		.returning();

	return registro;
}

export async function excluirOrdemServicoItemLote(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.delete(ordemservicoitemlote)
		.where(
			and(
				eq(ordemservicoitemlote.id, id),
				eq(ordemservicoitemlote.idempresa, idempresa),
			),
		)
		.returning();

	return registro;
}

export async function listarLotesPorItem(
	idordemservicoitem: string,
	idempresa: string,
) {
	return db
		.select()
		.from(ordemservicoitemlote)
		.where(
			and(
				eq(ordemservicoitemlote.idordemservicoitem, idordemservicoitem),
				eq(ordemservicoitemlote.idempresa, idempresa),
			),
		)
		.orderBy(desc(ordemservicoitemlote.datacriacao));
}
