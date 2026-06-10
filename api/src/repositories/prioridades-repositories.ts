import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoPrioridade } from "@/model/prioridade-model";
import { prioridades as prioridadesTable } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarPrioridadePorId(id: string) {
	const [prioridade] = await db
		.select()
		.from(prioridadesTable)
		.where(eq(prioridadesTable.id, id));

	return prioridade;
}

export async function criarPrioridade(dadosPrioridade: NovoPrioridade) {
	const [prioridade] = await db
		.insert(prioridadesTable)
		.values(dadosPrioridade)
		.returning();

	return prioridade;
}

export async function atualizarPrioridade(
	id: string,
	dadosPrioridade: Partial<NovoPrioridade>,
) {
	const [prioridade] = await db
		.update(prioridadesTable)
		.set(dadosPrioridade)
		.where(eq(prioridadesTable.id, id))
		.returning();

	return prioridade;
}

export async function excluirPrioridade(id: string) {
	const [prioridade] = await db
		.delete(prioridadesTable)
		.where(eq(prioridadesTable.id, id))
		.returning();

	return prioridade;
}

export type ListarPrioridadesParametros = {
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarPrioridades({
	descricao,
	inativo,
	limit = 10,
	page = 1,
}: ListarPrioridadesParametros) {
	const where = [];

	if (descricao) {
		where.push(ilike(prioridadesTable.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(prioridadesTable.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, prioridades] = await Promise.all([
		db
			.select({ value: count() })
			.from(prioridadesTable)
			.where(and(...where)),
		db
			.select()
			.from(prioridadesTable)
			.where(and(...where))
			.orderBy(desc(prioridadesTable.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		prioridades,
		total: totalCount[0]?.value ?? 0,
	};
}
