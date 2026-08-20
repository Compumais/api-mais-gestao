import { and, count, desc, eq, gte, ilike, inArray, lte } from "drizzle-orm";
import type { NovoFinanceiro } from "@/model/financeiro-model.js";
import * as schema from "@/repositories/schema.js";
import { db } from "./connection.js";

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

export async function buscarFinanceirosPorOrigem(
	idempresa: string,
	tipoorigem: number,
	idorigem: string,
) {
	return db
		.select()
		.from(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipoorigem, tipoorigem),
				eq(schema.financeiro.idorigem, idorigem),
			),
		);
}

export async function excluirFinanceirosPorOrigem(
	idempresa: string,
	tipoorigem: number,
	idorigem: string,
) {
	const removidos = await db
		.delete(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipoorigem, tipoorigem),
				eq(schema.financeiro.idorigem, idorigem),
			),
		)
		.returning({ id: schema.financeiro.id });

	return removidos.length;
}

interface ListarFinanceiroParametros {
	idempresas: string[];
	page?: number;
	limit?: number;
	saldo?: string | null | undefined;
	emissao?: string | null | undefined;
	emitente?: string | null | undefined;
	emissaoInicio?: string | null | undefined;
	emissaoFim?: string | null | undefined;
	vencimentoInicio?: string | null | undefined;
	vencimentoFim?: string | null | undefined;
	status?: string | null | undefined;
	tipo?: "P" | "R" | null | undefined;
}

export async function listarFinanceiro({
	idempresas,
	page = 1,
	limit = 10,
	saldo,
	emissao,
	emitente,
	emissaoInicio,
	emissaoFim,
	vencimentoInicio,
	vencimentoFim,
	status,
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

	if (emitente?.trim()) {
		where.push(ilike(schema.financeiro.emitente, `%${emitente.trim()}%`));
	}

	if (emissaoInicio) {
		where.push(gte(schema.financeiro.emissao, emissaoInicio));
	}

	if (emissaoFim) {
		where.push(lte(schema.financeiro.emissao, emissaoFim));
	}

	if (vencimentoInicio) {
		where.push(gte(schema.financeiro.vencimento, vencimentoInicio));
	}

	if (vencimentoFim) {
		where.push(lte(schema.financeiro.vencimento, vencimentoFim));
	}

	if (status) {
		where.push(eq(schema.financeiro.status, status));
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
