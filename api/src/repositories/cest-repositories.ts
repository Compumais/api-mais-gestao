import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoCEST } from "@/model/cest-mode";
import { cest } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarCestPorId(id: string) {
	const [registro] = await db.select().from(cest).where(eq(cest.id, id));

	return registro;
}

export async function criarCest(dadosCest: NovoCEST) {
	const [registro] = await db.insert(cest).values(dadosCest).returning();

	return registro;
}

export async function atualizarCest(id: string, dadosCest: Partial<NovoCEST>) {
	const [registro] = await db
		.update(cest)
		.set(dadosCest)
		.where(eq(cest.id, id))
		.returning();

	return registro;
}

export async function excluirCest(id: string) {
	const [registro] = await db.delete(cest).where(eq(cest.id, id)).returning();

	return registro;
}

export type ListarCestsParametros = {
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarCests({
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarCestsParametros) {
	const where = [];

	where.push(eq(cest.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(cest.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(cest.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, cests] = await Promise.all([
		db
			.select({ value: count() })
			.from(cest)
			.where(and(...where)),
		db
			.select()
			.from(cest)
			.where(and(...where))
			.orderBy(desc(cest.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		cests,
		total: totalCount[0]?.value ?? 0,
	};
}
