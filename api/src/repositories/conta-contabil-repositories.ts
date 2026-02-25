import { and, asc, count, eq, ilike } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type ContaContabil = typeof schema.contacontabil.$inferSelect;
export type NovaContaContabil = typeof schema.contacontabil.$inferInsert;

export async function criarContaContabil(dados: NovaContaContabil) {
	const [contaContabil] = await db
		.insert(schema.contacontabil)
		.values(dados)
		.returning();

	return contaContabil;
}

export async function buscarContaContabilPorId(id: string) {
	const [contaContabil] = await db
		.select()
		.from(schema.contacontabil)
		.where(eq(schema.contacontabil.id, id));

	return contaContabil;
}

interface ListarContasContabeisParametros {
	idempresa: string;
	descricao?: string | undefined;
	page?: number;
	limit?: number;
}

export async function listarContasContabeis({
	idempresa,
	descricao,
	page = 1,
	limit = 10,
}: ListarContasContabeisParametros) {
	const where = [];

	where.push(eq(schema.contacontabil.idempresa, idempresa));

	if (descricao && descricao.trim() !== "") {
		where.push(ilike(schema.contacontabil.descricao, `%${descricao}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, contasContabeis] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.contacontabil)
			.where(and(...where)),
		db
			.select()
			.from(schema.contacontabil)
			.where(and(...where))
			.orderBy(asc(schema.contacontabil.codigoreduzido))
			.limit(limit)
			.offset(offset),
	]);

	return {
		contasContabeis,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function atualizarContaContabil(
	id: string,
	dados: Partial<NovaContaContabil>,
) {
	const [contaContabil] = await db
		.update(schema.contacontabil)
		.set(dados)
		.where(eq(schema.contacontabil.id, id))
		.returning();

	return contaContabil;
}

export async function excluirContaContabil(id: string) {
	const [contaContabil] = await db
		.delete(schema.contacontabil)
		.where(eq(schema.contacontabil.id, id))
		.returning();

	return contaContabil;
}

export async function buscarContasFilhas(idcontapai: string) {
	const contasFilhas = await db
		.select()
		.from(schema.contacontabil)
		.where(eq(schema.contacontabil.idcontapai, idcontapai));

	return contasFilhas;
}
