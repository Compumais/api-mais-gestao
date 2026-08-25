import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	isNotNull,
	isNull,
	lte,
	ne,
	sql,
	sum,
} from "drizzle-orm";
import type { NovoBudget } from "@/model/budget-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

const camposBudgetComPlanoContas = {
	id: schema.budget.id,
	idempresa: schema.budget.idempresa,
	idplanocontas: schema.budget.idplanocontas,
	ano: schema.budget.ano,
	periodicidade: schema.budget.periodicidade,
	mes: schema.budget.mes,
	valor: schema.budget.valor,
	currenttimemillis: schema.budget.currenttimemillis,
	planocontascodigo: schema.planocontas.codigo,
	planocontasnome: schema.planocontas.nome,
};

export async function criarBudget(dadosBudget: NovoBudget) {
	const [budget] = await db
		.insert(schema.budget)
		.values(dadosBudget)
		.returning();

	return budget;
}

export async function buscarBudgetPorId(id: string) {
	const [budget] = await db
		.select()
		.from(schema.budget)
		.where(eq(schema.budget.id, id));

	return budget;
}

interface BuscarBudgetDuplicadoParametros {
	idempresa: string;
	idplanocontas: string;
	ano: number;
	mes?: number | null | undefined;
	ignorarId?: string | undefined;
}

export async function buscarBudgetDuplicado({
	idempresa,
	idplanocontas,
	ano,
	mes,
	ignorarId,
}: BuscarBudgetDuplicadoParametros) {
	const where = [
		eq(schema.budget.idempresa, idempresa),
		eq(schema.budget.idplanocontas, idplanocontas),
		eq(schema.budget.ano, ano),
		mes === null || mes === undefined
			? isNull(schema.budget.mes)
			: eq(schema.budget.mes, mes),
	];

	if (ignorarId) {
		where.push(ne(schema.budget.id, ignorarId));
	}

	const [budget] = await db
		.select()
		.from(schema.budget)
		.where(and(...where));

	return budget;
}

interface ListarBudgetsParametros {
	idempresa: string;
	ano?: number | undefined;
	mes?: number | undefined;
	periodicidade?: string | undefined;
	idplanocontas?: string | undefined;
	page?: number | undefined;
	limit?: number | undefined;
}

export async function listarBudgets({
	idempresa,
	ano,
	mes,
	periodicidade,
	idplanocontas,
	page = 1,
	limit = 10,
}: ListarBudgetsParametros) {
	const where = [eq(schema.budget.idempresa, idempresa)];

	if (ano) {
		where.push(eq(schema.budget.ano, ano));
	}

	if (mes) {
		where.push(eq(schema.budget.mes, mes));
	}

	if (periodicidade) {
		where.push(eq(schema.budget.periodicidade, periodicidade));
	}

	if (idplanocontas) {
		where.push(eq(schema.budget.idplanocontas, idplanocontas));
	}

	const offset = (page - 1) * limit;

	const [totalCount, budgets] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.budget)
			.where(and(...where)),
		db
			.select(camposBudgetComPlanoContas)
			.from(schema.budget)
			.leftJoin(
				schema.planocontas,
				eq(schema.budget.idplanocontas, schema.planocontas.id),
			)
			.where(and(...where))
			.orderBy(
				desc(schema.budget.ano),
				asc(schema.planocontas.codigo),
				asc(schema.budget.mes),
			)
			.limit(limit)
			.offset(offset),
	]);

	return {
		budgets,
		total: totalCount[0]?.value ?? 0,
	};
}

interface ListarBudgetsPorAnoParametros {
	idempresa: string;
	ano: number;
}

export async function listarBudgetsPorAno({
	idempresa,
	ano,
}: ListarBudgetsPorAnoParametros) {
	return db
		.select(camposBudgetComPlanoContas)
		.from(schema.budget)
		.leftJoin(
			schema.planocontas,
			eq(schema.budget.idplanocontas, schema.planocontas.id),
		)
		.where(
			and(eq(schema.budget.idempresa, idempresa), eq(schema.budget.ano, ano)),
		)
		.orderBy(asc(schema.planocontas.codigo), asc(schema.budget.mes));
}

interface SomarGastosPorPlanoContasParametros {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
}

export async function somarGastosPorPlanoContas({
	idempresa,
	dataInicio,
	dataFim,
}: SomarGastosPorPlanoContasParametros) {
	return db
		.select({
			idplanocontas: schema.contacorrentelancamento.idplanocontas,
			total: sum(schema.contacorrentelancamento.valor),
		})
		.from(schema.contacorrentelancamento)
		.innerJoin(
			schema.contacorrente,
			eq(
				schema.contacorrentelancamento.idcontacorrente,
				schema.contacorrente.id,
			),
		)
		.where(
			and(
				eq(schema.contacorrente.idempresa, idempresa),
				sql`trim(${schema.contacorrentelancamento.tipo}) in ('S', 'D')`,
				isNotNull(schema.contacorrentelancamento.idplanocontas),
				isNull(schema.contacorrentelancamento.idlancamentotransferencia),
				isNull(schema.contacorrentelancamento.idlancamentoestornado),
				gte(schema.contacorrentelancamento.datahora, dataInicio),
				lte(schema.contacorrentelancamento.datahora, dataFim),
			),
		)
		.groupBy(schema.contacorrentelancamento.idplanocontas);
}

interface AtualizarBudgetParametros {
	id: string;
	dados: {
		idplanocontas?: string | undefined;
		ano?: number | undefined;
		periodicidade?: string | undefined;
		mes?: number | null | undefined;
		valor?: string | undefined;
		currenttimemillis?: number | undefined;
	};
}

export async function atualizarBudget({
	id,
	dados,
}: AtualizarBudgetParametros) {
	const [budget] = await db
		.update(schema.budget)
		.set(dados)
		.where(eq(schema.budget.id, id))
		.returning();

	return budget;
}

export async function excluirBudget(id: string) {
	const [budget] = await db
		.delete(schema.budget)
		.where(eq(schema.budget.id, id))
		.returning();

	return budget;
}
