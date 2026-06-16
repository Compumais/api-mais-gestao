import { and, count, desc, eq } from "drizzle-orm";
import type { NovoPlanoContasContaContabil } from "@/model/plano-contas-conta-contabil-model";
import { planocontascontacontabil } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarPlanoContasContaContabilPorId(id: string) {
	const [registro] = await db
		.select()
		.from(planocontascontacontabil)
		.where(eq(planocontascontacontabil.id, id));

	return registro;
}

export async function criarPlanoContasContaContabil(
	dadosPlanoContasContaContabil: NovoPlanoContasContaContabil,
) {
	const [registro] = await db
		.insert(planocontascontacontabil)
		.values(dadosPlanoContasContaContabil)
		.returning();

	return registro;
}

export async function atualizarPlanoContasContaContabil(
	id: string,
	dadosPlanoContasContaContabil: Partial<NovoPlanoContasContaContabil>,
) {
	const [registro] = await db
		.update(planocontascontacontabil)
		.set(dadosPlanoContasContaContabil)
		.where(eq(planocontascontacontabil.id, id))
		.returning();

	return registro;
}

export async function excluirPlanoContasContaContabil(id: string) {
	const [registro] = await db
		.delete(planocontascontacontabil)
		.where(eq(planocontascontacontabil.id, id))
		.returning();

	return registro;
}

export type ListarPlanosContasContaContabilParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
};

export async function listarPlanosContasContaContabil({
	idempresa,
	page = 1,
	limit = 10,
}: ListarPlanosContasContaContabilParametros) {
	const where = [];

	where.push(eq(planocontascontacontabil.idempresa, idempresa));

	const offset = (page - 1) * limit;

	const [totalCount, planoscontascontacontabil] = await Promise.all([
		db
			.select({ value: count() })
			.from(planocontascontacontabil)
			.where(and(...where)),
		db
			.select()
			.from(planocontascontacontabil)
			.where(and(...where))
			.orderBy(desc(planocontascontacontabil.currenttimemillis))
			.limit(limit)
			.offset(offset),
	]);

	return {
		planoscontascontacontabil,
		total: totalCount[0]?.value ?? 0,
	};
}
