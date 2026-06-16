import { and, count, desc, eq } from "drizzle-orm";
import type { NovoEntidadeContaContabil } from "@/model/entidade-conta-contabil-model";
import { entidadecontacontabil } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarEntidadeContaContabilPorId(id: string) {
	const [registro] = await db
		.select()
		.from(entidadecontacontabil)
		.where(eq(entidadecontacontabil.id, id));

	return registro;
}

export async function criarEntidadeContaContabil(
	dadosEntidadeContaContabil: NovoEntidadeContaContabil,
) {
	const [registro] = await db
		.insert(entidadecontacontabil)
		.values(dadosEntidadeContaContabil)
		.returning();

	return registro;
}

export async function atualizarEntidadeContaContabil(
	id: string,
	dadosEntidadeContaContabil: Partial<NovoEntidadeContaContabil>,
) {
	const [registro] = await db
		.update(entidadecontacontabil)
		.set(dadosEntidadeContaContabil)
		.where(eq(entidadecontacontabil.id, id))
		.returning();

	return registro;
}

export async function excluirEntidadeContaContabil(id: string) {
	const [registro] = await db
		.delete(entidadecontacontabil)
		.where(eq(entidadecontacontabil.id, id))
		.returning();

	return registro;
}

export type ListarEntidadesContaContabilParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
};

export async function listarEntidadesContaContabil({
	idempresa,
	page = 1,
	limit = 10,
}: ListarEntidadesContaContabilParametros) {
	const where = [];

	where.push(eq(entidadecontacontabil.idempresa, idempresa));

	const offset = (page - 1) * limit;

	const [totalCount, entidadescontacontabil] = await Promise.all([
		db
			.select({ value: count() })
			.from(entidadecontacontabil)
			.where(and(...where)),
		db
			.select()
			.from(entidadecontacontabil)
			.where(and(...where))
			.orderBy(desc(entidadecontacontabil.datacadastro))
			.limit(limit)
			.offset(offset),
	]);

	return {
		entidadescontacontabil,
		total: totalCount[0]?.value ?? 0,
	};
}
