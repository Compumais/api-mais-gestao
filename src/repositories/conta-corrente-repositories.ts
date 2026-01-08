import { and, count, eq, inArray } from "drizzle-orm";
import type { NovaContaCorrente } from "@/model/conta-corrente-model";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection";

export async function criarContaCorrente(
	dadosContaCorrente: NovaContaCorrente,
) {
	const contaCorrente = await db
		.insert(schema.contacorrente)
		.values(dadosContaCorrente)
		.returning();

	return contaCorrente[0];
}

export async function excluirContaCorrente({ id }: { id: string }) {
	const [planoContas] = await db
		.delete(schema.contacorrente)
		.where(eq(schema.contacorrente.id, id))
		.returning();

	return planoContas;
}

export async function buscarContaCorrentePorId({ id }: { id: string }) {
	const [contaCorrente] = await db
		.select()
		.from(schema.contacorrente)
		.where(eq(schema.contacorrente.id, id));

	return contaCorrente;
}

export type ListarContaCorrenteParametros = {
	empresaIds: string[];
	page?: number;
	limit?: number;
};

export async function listarContaCorrentePorEmpresa({
	empresaIds,
	page = 1,
	limit = 10,
}: ListarContaCorrenteParametros) {
	const where = [];

	if (empresaIds.length === 0) {
		return {
			contasCorrentes: [],
			total: 0,
		};
	}

	where.push(inArray(schema.contacorrente.empresaId, empresaIds));

	const offset = (page - 1) * limit;

	const [totalCount, contasCorrentes] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.contacorrente)
			.where(and(...where)),
		db
			.select()
			.from(schema.contacorrente)
			.where(and(...where))
			.orderBy(schema.contacorrente.idbanco)
			.limit(limit)
			.offset(offset),
	]);

	return {
		contasCorrentes,
		total: totalCount[0]?.value ?? 0,
	};
}

export type AtualizaContaCorrenteParametros = {
	id: string;
	dados: Partial<NovaContaCorrente>;
};

export async function atualizaContaCorrente({
	id,
	dados,
}: AtualizaContaCorrenteParametros) {
	const [contaCorrente] = await db
		.update(schema.contacorrente)
		.set(dados)
		.where(eq(schema.contacorrente.id, id))
		.returning();

	return contaCorrente;
}
