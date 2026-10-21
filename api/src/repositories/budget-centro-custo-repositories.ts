import { and, eq, isNull, ne, sum } from "drizzle-orm";
import type { NovoBudgetCentroCusto } from "@/model/budget-centro-custo-model.js";
import type { RegimeApropriacao } from "@/constants/centro-custo.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";
import { somarRealizadoPorCentroCusto } from "./apropriacao-centro-custo-repositories.js";

const camposComCentro = {
	id: schema.budgetcentrocusto.id,
	idempresa: schema.budgetcentrocusto.idempresa,
	idcentrocusto: schema.budgetcentrocusto.idcentrocusto,
	idplanocontas: schema.budgetcentrocusto.idplanocontas,
	ano: schema.budgetcentrocusto.ano,
	periodicidade: schema.budgetcentrocusto.periodicidade,
	mes: schema.budgetcentrocusto.mes,
	valor: schema.budgetcentrocusto.valor,
	currenttimemillis: schema.budgetcentrocusto.currenttimemillis,
	centrocustocodigo: schema.centrocusto.codigoreduzido,
	centrocustonome: schema.centrocusto.nome,
	planocontascodigo: schema.planocontas.codigo,
	planocontasnome: schema.planocontas.nome,
};

export async function criarBudgetCentroCusto(dados: NovoBudgetCentroCusto) {
	const [registro] = await db
		.insert(schema.budgetcentrocusto)
		.values(dados)
		.returning();
	return registro;
}

export async function buscarBudgetCentroCustoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(schema.budgetcentrocusto)
		.where(eq(schema.budgetcentrocusto.id, id));
	return registro;
}

export async function listarBudgetsCentroCustoPorAno({
	idempresa,
	ano,
}: {
	idempresa: string;
	ano: number;
}) {
	return db
		.select(camposComCentro)
		.from(schema.budgetcentrocusto)
		.innerJoin(
			schema.centrocusto,
			eq(schema.budgetcentrocusto.idcentrocusto, schema.centrocusto.id),
		)
		.leftJoin(
			schema.planocontas,
			eq(schema.budgetcentrocusto.idplanocontas, schema.planocontas.id),
		)
		.where(
			and(
				eq(schema.budgetcentrocusto.idempresa, idempresa),
				eq(schema.budgetcentrocusto.ano, ano),
			),
		);
}

export async function buscarBudgetCentroCustoDuplicado(params: {
	idempresa: string;
	idcentrocusto: string;
	idplanocontas?: string | null;
	ano: number;
	mes?: number | null;
	ignorarId?: string;
}) {
	const where = [
		eq(schema.budgetcentrocusto.idempresa, params.idempresa),
		eq(schema.budgetcentrocusto.idcentrocusto, params.idcentrocusto),
		eq(schema.budgetcentrocusto.ano, params.ano),
		params.idplanocontas
			? eq(schema.budgetcentrocusto.idplanocontas, params.idplanocontas)
			: isNull(schema.budgetcentrocusto.idplanocontas),
		params.mes === null || params.mes === undefined
			? isNull(schema.budgetcentrocusto.mes)
			: eq(schema.budgetcentrocusto.mes, params.mes),
	];
	if (params.ignorarId) {
		where.push(ne(schema.budgetcentrocusto.id, params.ignorarId));
	}
	const [registro] = await db
		.select()
		.from(schema.budgetcentrocusto)
		.where(and(...where));
	return registro;
}

export async function atualizarBudgetCentroCusto(
	id: string,
	dados: Partial<NovoBudgetCentroCusto>,
) {
	const [registro] = await db
		.update(schema.budgetcentrocusto)
		.set(dados)
		.where(eq(schema.budgetcentrocusto.id, id))
		.returning();
	return registro;
}

export async function excluirBudgetCentroCusto(id: string) {
	const [registro] = await db
		.delete(schema.budgetcentrocusto)
		.where(eq(schema.budgetcentrocusto.id, id))
		.returning();
	return registro;
}

export async function somarLimiteOrcamentoCentroNoPeriodo({
	idempresa,
	idcentrocusto,
	ano,
	mes,
}: {
	idempresa: string;
	idcentrocusto: string;
	ano: number;
	mes?: number;
}) {
	const where = [
		eq(schema.budgetcentrocusto.idempresa, idempresa),
		eq(schema.budgetcentrocusto.idcentrocusto, idcentrocusto),
		eq(schema.budgetcentrocusto.ano, ano),
	];
	if (mes !== undefined) {
		where.push(eq(schema.budgetcentrocusto.mes, mes));
	}
	const [row] = await db
		.select({ total: sum(schema.budgetcentrocusto.valor) })
		.from(schema.budgetcentrocusto)
		.where(and(...where));
	return Number(row?.total ?? 0);
}

export async function obterRealizadoCentroCustoPeriodo({
	idempresa,
	idcentrocusto,
	dataInicio,
	dataFim,
	regime,
}: {
	idempresa: string;
	idcentrocusto: string;
	dataInicio: string;
	dataFim: string;
	regime: RegimeApropriacao;
}) {
	const rows = await somarRealizadoPorCentroCusto({
		idempresa,
		dataInicio,
		dataFim,
		regime,
		idcentrocusto,
	});
	return rows.reduce((acc, row) => acc + Number(row.total ?? 0), 0);
}
