import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	type SQL,
} from "drizzle-orm";
import type { NovoFinanceiro } from "@/model/financeiro-model.js";
import * as schema from "@/repositories/schema.js";
import { db } from "./connection.js";

export const ORDENAR_FINANCEIROS_CAMPOS = [
	"documento",
	"emitente",
	"parcela",
	"status",
	"emissao",
	"vencimento",
	"valor",
	"saldo",
	"currenttimemillis",
] as const;

export type OrdenarFinanceirosCampo =
	(typeof ORDENAR_FINANCEIROS_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	documento: schema.financeiro.documento,
	emitente: schema.financeiro.emitente,
	parcela: schema.financeiro.parcela,
	status: schema.financeiro.status,
	emissao: schema.financeiro.emissao,
	vencimento: schema.financeiro.vencimento,
	valor: schema.financeiro.valor,
	saldo: schema.financeiro.saldo,
	currenttimemillis: schema.financeiro.currenttimemillis,
} as const;

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | null | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

export async function criarFinanceiro(data: NovoFinanceiro) {
	const [financeiro] = await db
		.insert(schema.financeiro)
		.values(data)
		.returning();

	return financeiro;
}

export async function criarFinanceiros(dados: NovoFinanceiro[]) {
	if (dados.length === 0) return [];
	return db.transaction((tx) =>
		tx.insert(schema.financeiro).values(dados).returning(),
	);
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
	documento?: string | null | undefined;
	emitente?: string | null | undefined;
	emissaoInicio?: string | null | undefined;
	emissaoFim?: string | null | undefined;
	vencimentoInicio?: string | null | undefined;
	vencimentoFim?: string | null | undefined;
	status?: string | null | undefined;
	tipo?: "P" | "R" | null | undefined;
	ordenarPor?: OrdenarFinanceirosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
}

export async function listarFinanceiro({
	idempresas,
	page = 1,
	limit = 10,
	saldo,
	emissao,
	documento,
	emitente,
	emissaoInicio,
	emissaoFim,
	vencimentoInicio,
	vencimentoFim,
	status,
	tipo,
	ordenarPor,
	ordem = "desc",
}: ListarFinanceiroParametros) {
	const offset = (page - 1) * limit;

	const where: SQL[] = [];

	if (saldo) {
		where.push(ilike(schema.financeiro.saldo, saldo));
	}

	if (emissao) {
		where.push(ilike(schema.financeiro.emissao, emissao));
	}

	adicionarFiltroTexto(where, schema.financeiro.documento, documento);
	adicionarFiltroTexto(where, schema.financeiro.emitente, emitente);

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

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "asc"
				? asc(COLUNAS_ORDENACAO[ordenarPor])
				: desc(COLUNAS_ORDENACAO[ordenarPor])
			: desc(schema.financeiro.currenttimemillis);

	const [totalCount, financeiros] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.financeiro)
			.where(and(inArray(schema.financeiro.idempresa, idempresas), ...where)),
		db
			.select()
			.from(schema.financeiro)
			.where(and(inArray(schema.financeiro.idempresa, idempresas), ...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		financeiros,
		total: totalCount[0]?.value ?? 0,
	};
}
