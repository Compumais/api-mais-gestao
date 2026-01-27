import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { NovoMotivoBaixaFinanceiro } from "@/model/motivo-baixa-financeiro-model";
import * as schema from "@/repositories/schema";
import { db } from "./connection.js";

export async function criarMotivoBaixaFinanceiro(
	dados: NovoMotivoBaixaFinanceiro,
) {
	const [motivoBaixaFinanceiro] = await db
		.insert(schema.motivobaixafinanceiro)
		.values(dados)
		.returning();

	return motivoBaixaFinanceiro;
}

export async function buscarMotivoBaixaFinanceiroPorId(id: string) {
	const [motivoBaixaFinanceiro] = await db
		.select()
		.from(schema.motivobaixafinanceiro)
		.where(eq(schema.motivobaixafinanceiro.id, id));

	return motivoBaixaFinanceiro;
}

export async function atualizarMotivoBaixaFinanceiro(
	id: string,
	dados: {
		inativo?: number | null | undefined;
	},
) {
	const [motivoBaixaFinanceiro] = await db
		.update(schema.motivobaixafinanceiro)
		.set(dados)
		.where(eq(schema.motivobaixafinanceiro.id, id))
		.returning();

	return motivoBaixaFinanceiro;
}

export async function excluirMotivoBaixaFinanceiro(id: string) {
	const [motivoBaixaFinanceiro] = await db
		.delete(schema.motivobaixafinanceiro)
		.where(eq(schema.motivobaixafinanceiro.id, id))
		.returning();

	return motivoBaixaFinanceiro;
}

export type ListarMotivoBaixaFinanceiroParametros = {
	idempresas: string[];
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarMotivosBaixaFinanceiro({
	idempresas,
	inativo,
	page = 1,
	limit = 10,
}: ListarMotivoBaixaFinanceiroParametros) {
	const where = [];

	if (idempresas.length === 0) {
		return {
			motivosBaixaFinanceiro: [],
			total: 0,
		};
	}

	where.push(inArray(schema.motivobaixafinanceiro.idempresa, idempresas));

	if (inativo) {
		where.push(eq(schema.motivobaixafinanceiro.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, motivosBaixaFinanceiro] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.motivobaixafinanceiro)
			.where(and(...where)),
		db
			.select()
			.from(schema.motivobaixafinanceiro)
			.where(and(...where))
			.orderBy(desc(schema.motivobaixafinanceiro.currenttimemillis))
			.limit(limit)
			.offset(offset),
	]);

	return {
		motivosBaixaFinanceiro,
		total: totalCount[0]?.value ?? 0,
	};
}
