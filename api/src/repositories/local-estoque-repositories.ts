import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoLocalEstoque } from "@/model/local-estoque-model";
import { localestoque } from "@/repositories/schema.js";
import { db } from "./connection";

export async function criarLocalEstoque(dadosLocalEstoque: NovoLocalEstoque) {
	const [registro] = await db
		.insert(localestoque)
		.values(dadosLocalEstoque)
		.returning();

	return registro;
}

export async function buscarLocalEstoquePorId(id: string) {
	const [registro] = await db
		.select()
		.from(localestoque)
		.where(eq(localestoque.id, id));

	return registro;
}

export async function atualizarLocalEstoque(
	id: string,
	dados: {
		codigo?: string | null | undefined;
		descricao?: string | null | undefined;
		inativo?: number | null | undefined;
		posse?: string | null | undefined;
		tipo?: number | null | undefined;
	},
) {
	const [registro] = await db
		.update(localestoque)
		.set(dados)
		.where(eq(localestoque.id, id))
		.returning();

	return registro;
}

export async function excluirLocalEstoque(id: string) {
	const [registro] = await db
		.delete(localestoque)
		.where(eq(localestoque.id, id))
		.returning();

	return registro;
}

export type ListarLocaisEstoqueParametros = {
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarLocaisEstoque({
	idempresa,
	descricao,
	codigo,
	page = 1,
	limit = 10,
}: ListarLocaisEstoqueParametros) {
	const where = [eq(localestoque.idempresa, idempresa)];

	if (descricao) {
		where.push(ilike(localestoque.descricao, `%${descricao}%`));
	}

	if (codigo) {
		where.push(ilike(localestoque.codigo, `%${codigo}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, locaisEstoque] = await Promise.all([
		db
			.select({ value: count() })
			.from(localestoque)
			.where(and(...where)),
		db
			.select()
			.from(localestoque)
			.where(and(...where))
			.orderBy(desc(localestoque.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		locaisEstoque,
		total: totalCount[0]?.value ?? 0,
	};
}
