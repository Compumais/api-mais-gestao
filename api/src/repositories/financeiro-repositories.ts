import { and, count, desc, eq, ilike, inArray } from "drizzle-orm";
import type { NovoFinanceiro } from "@/model/financeiro-model";
import * as schema from "@/repositories/schema";
import { db } from "./connection";

export async function criarFinanceiro(data: NovoFinanceiro) {
	const [financeiro] = await db
		.insert(schema.financeiro)
		.values(data)
		.returning();

	return financeiro;
}

export async function buscarFinanceiroPorId(id: string) {
	const [financeiro] = await db
		.select()
		.from(schema.financeiro)
		.where(eq(schema.financeiro.id, id));

	return financeiro;
}

export async function deletarFinanceiro(id: string) {
	const resultado = await db
		.delete(schema.financeiro)
		.where(eq(schema.financeiro.id, id));

	return resultado;
}

export async function atualizarFinanceiro(
	id: string,
	data: Partial<NovoFinanceiro>,
) {
	const [financeiro] = await db
		.update(schema.financeiro)
		.set(data)
		.where(eq(schema.financeiro.id, id))
		.returning();

	return financeiro;
}

interface ListarFinanceiroParametros {
	idempresas: string[];
	page?: number;
	limit?: number;
	saldo?: string | null | undefined;
	emissao?: string | null | undefined;
	tipo?: "P" | "R" | null | undefined;
}

export async function listarFinanceiro({
	idempresas,
	page = 1,
	limit = 10,
	saldo,
	emissao,
	tipo,
}: ListarFinanceiroParametros) {
	const offset = (page - 1) * limit;

	const where = [];

	if (saldo) {
		where.push(ilike(schema.financeiro.saldo, saldo));
	}

	if (emissao) {
		where.push(ilike(schema.financeiro.emissao, emissao));
	}

	if (tipo) {
		where.push(eq(schema.financeiro.tipo, tipo));
	}

	const [totalCount, financeiros] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.financeiro)
			.where(and(inArray(schema.financeiro.idempresa, idempresas), ...where)),
		db
			.select()
			.from(schema.financeiro)
			.where(and(inArray(schema.financeiro.idempresa, idempresas), ...where))
			.orderBy(desc(schema.financeiro.currenttimemillis))
			.limit(limit)
			.offset(offset),
	]);

	return {
		financeiros,
		total: totalCount[0]?.value ?? 0,
	};
}
