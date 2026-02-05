import { count, desc, eq } from "drizzle-orm";
import type { NovoFinanceiroLancamento } from "@/model/financeiro-lancamentos-model";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection";

export async function criarFinanceiroLancamento(
	dados: NovoFinanceiroLancamento,
) {
	const [financeiroLancamento] = await db
		.insert(schema.financeirolancamento)
		.values(dados)
		.returning();

	return financeiroLancamento;
}

export async function buscarFinanceiroLancamentoPorId(id: string) {
	const [financeiroLancamento] = await db
		.select()
		.from(schema.financeirolancamento)
		.where(eq(schema.financeirolancamento.id, id));

	return financeiroLancamento;
}

export async function atualizarFinanceiroLancamento(
	id: string,
	dados: Partial<NovoFinanceiroLancamento>,
) {
	const [financeiroLancamento] = await db
		.update(schema.financeirolancamento)
		.set(dados)
		.where(eq(schema.financeirolancamento.id, id))
		.returning();

	return financeiroLancamento;
}

export async function excluirFinanceiroLancamento(id: string) {
	const [financeirolancamento] = await db
		.delete(schema.financeirolancamento)
		.where(eq(schema.financeirolancamento.id, id))
		.returning();

	return financeirolancamento;
}

interface ListarFinanceiroLancamentoParametros {
	idfinanceiro: string;
	page?: number;
	limit?: number;
}

export async function listarFinanceiroLancamento({
	idfinanceiro,
	page = 1,
	limit = 10,
}: ListarFinanceiroLancamentoParametros) {
	const offset = (page - 1) * limit;

	const [totalCount, financeiroLancamentos] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.financeirolancamento)
			.where(eq(schema.financeirolancamento.idfinanceiro, idfinanceiro)),
		db
			.select()
			.from(schema.financeirolancamento)
			.where(eq(schema.financeirolancamento.idfinanceiro, idfinanceiro))
			.orderBy(desc(schema.financeirolancamento.currenttimemillis))
			.limit(limit)
			.offset(offset),
	]);

	return {
		financeiroLancamentos,
		total: totalCount[0]?.value ?? 0,
	};
}
