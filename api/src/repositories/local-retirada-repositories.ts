import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoLocalRetirada } from "@/model/local-retirada-model";
import { localretirada } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarLocalRetiradaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(localretirada)
		.where(eq(localretirada.id, id));

	return registro;
}

export async function criarLocalRetirada(dadosLocalRetirada: NovoLocalRetirada) {
	const [registro] = await db
		.insert(localretirada)
		.values(dadosLocalRetirada)
		.returning();

	return registro;
}

export async function atualizarLocalRetirada(
	id: string,
	dadosLocalRetirada: Partial<NovoLocalRetirada>,
) {
	const [registro] = await db
		.update(localretirada)
		.set(dadosLocalRetirada)
		.where(eq(localretirada.id, id))
		.returning();

	return registro;
}

export async function excluirLocalRetirada(id: string) {
	const [registro] = await db
		.delete(localretirada)
		.where(eq(localretirada.id, id))
		.returning();

	return registro;
}

export type ListarLocaisRetiradaParametros = {
	idempresa: string;
	descricao?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarLocaisRetirada({
	idempresa,
	descricao,
	page = 1,
	limit = 10,
}: ListarLocaisRetiradaParametros) {
	const where = [];

	where.push(eq(localretirada.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(localretirada.descricao, `%${descricao}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, localretiradas] = await Promise.all([
		db
			.select({ value: count() })
			.from(localretirada)
			.where(and(...where)),
		db
			.select()
			.from(localretirada)
			.where(and(...where))
			.orderBy(desc(localretirada.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		localretiradas,
		total: totalCount[0]?.value ?? 0,
	};
}
