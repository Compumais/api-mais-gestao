import { and, count, desc, eq } from "drizzle-orm";
import type { NovoOrdemServico } from "@/model/ordem-servico-model";
import { ordemservico } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarOrdemServicoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(ordemservico)
		.where(eq(ordemservico.id, id));

	return registro;
}

export async function criarOrdemServico(dadosOrdemServico: NovoOrdemServico) {
	const [registro] = await db
		.insert(ordemservico)
		.values(dadosOrdemServico)
		.returning();

	return registro;
}

export async function atualizarOrdemServico(
	id: string,
	dadosOrdemServico: Partial<NovoOrdemServico>,
) {
	const [registro] = await db
		.update(ordemservico)
		.set(dadosOrdemServico)
		.where(eq(ordemservico.id, id))
		.returning();

	return registro;
}

export async function excluirOrdemServico(id: string) {
	const [registro] = await db
		.delete(ordemservico)
		.where(eq(ordemservico.id, id))
		.returning();

	return registro;
}

export type ListarOrdensServicoParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
};

export async function listarOrdensServico({
	idempresa,
	page = 1,
	limit = 10,
}: ListarOrdensServicoParametros) {
	const where = [];

	where.push(eq(ordemservico.idempresa, idempresa));

	const offset = (page - 1) * limit;

	const [totalCount, ordenservicos] = await Promise.all([
		db
			.select({ value: count() })
			.from(ordemservico)
			.where(and(...where)),
		db
			.select()
			.from(ordemservico)
			.where(and(...where))
			.orderBy(desc(ordemservico.currenttimemillis))
			.limit(limit)
			.offset(offset),
	]);

	return {
		ordenservicos,
		total: totalCount[0]?.value ?? 0,
	};
}
