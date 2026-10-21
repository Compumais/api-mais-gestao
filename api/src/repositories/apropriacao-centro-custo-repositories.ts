import { and, eq, gte, isNull, lte, sql, sum } from "drizzle-orm";
import type {
	ApropriacaoCentroCusto,
	NovaApropriacaoCentroCusto,
} from "@/model/apropriacao-centro-custo-model.js";
import type { OrigemTipoApropriacao, RegimeApropriacao } from "@/constants/centro-custo.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function listarApropriacoesPorOrigem({
	idempresa,
	origemtipo,
	origemid,
	regime,
}: {
	idempresa: string;
	origemtipo: OrigemTipoApropriacao;
	origemid: string;
	regime?: RegimeApropriacao;
}) {
	const where = [
		eq(schema.apropriacaocentrocusto.idempresa, idempresa),
		eq(schema.apropriacaocentrocusto.origemtipo, origemtipo),
		eq(schema.apropriacaocentrocusto.origemid, origemid),
	];
	if (regime) {
		where.push(eq(schema.apropriacaocentrocusto.regime, regime));
	}
	return db
		.select()
		.from(schema.apropriacaocentrocusto)
		.where(and(...where));
}

export async function excluirApropriacoesPorOrigem({
	idempresa,
	origemtipo,
	origemid,
	regime,
}: {
	idempresa: string;
	origemtipo: OrigemTipoApropriacao;
	origemid: string;
	regime?: RegimeApropriacao;
}) {
	const where = [
		eq(schema.apropriacaocentrocusto.idempresa, idempresa),
		eq(schema.apropriacaocentrocusto.origemtipo, origemtipo),
		eq(schema.apropriacaocentrocusto.origemid, origemid),
	];
	if (regime) {
		where.push(eq(schema.apropriacaocentrocusto.regime, regime));
	}
	return db
		.delete(schema.apropriacaocentrocusto)
		.where(and(...where))
		.returning();
}

export async function inserirApropriacoes(
	linhas: NovaApropriacaoCentroCusto[],
): Promise<ApropriacaoCentroCusto[]> {
	if (!linhas.length) return [];
	return db.insert(schema.apropriacaocentrocusto).values(linhas).returning();
}

export async function somarRealizadoPorCentroCusto({
	idempresa,
	dataInicio,
	dataFim,
	regime,
	idcentrocusto,
	idplanocontas,
}: {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	regime: RegimeApropriacao;
	idcentrocusto?: string;
	idplanocontas?: string;
}) {
	const where = [
		eq(schema.apropriacaocentrocusto.idempresa, idempresa),
		eq(schema.apropriacaocentrocusto.regime, regime),
		gte(schema.apropriacaocentrocusto.datalancamento, dataInicio),
		lte(schema.apropriacaocentrocusto.datalancamento, dataFim),
	];
	if (idcentrocusto) {
		where.push(eq(schema.apropriacaocentrocusto.idcentrocusto, idcentrocusto));
	}
	if (idplanocontas) {
		where.push(eq(schema.apropriacaocentrocusto.idplanocontas, idplanocontas));
	}

	return db
		.select({
			idcentrocusto: schema.apropriacaocentrocusto.idcentrocusto,
			idplanocontas: schema.apropriacaocentrocusto.idplanocontas,
			total: sum(schema.apropriacaocentrocusto.valor),
		})
		.from(schema.apropriacaocentrocusto)
		.where(and(...where))
		.groupBy(
			schema.apropriacaocentrocusto.idcentrocusto,
			schema.apropriacaocentrocusto.idplanocontas,
		);
}

export async function listarFinanceirosSemApropriacao({
	idempresa,
	limit = 50,
	page = 1,
}: {
	idempresa: string;
	limit?: number;
	page?: number;
}) {
	const offset = (page - 1) * limit;
	const rows = await db.execute(sql`
		SELECT f.id, f.documento, f.historico, f.valor, f.emissao, f.vencimento, f.idplanocontas
		FROM financeiro f
		INNER JOIN planocontas p ON p.id = f.idplanocontas
		WHERE f.idempresa = ${idempresa}
			AND COALESCE(p.centrocustoobrigatorio, 0) = 1
			AND NOT EXISTS (
				SELECT 1 FROM apropriacao_centro_custo a
				WHERE a.origemtipo = 'financeiro'
					AND a.origemid = f.id
					AND a.regime = 'competencia'
			)
		ORDER BY f.vencimento DESC NULLS LAST
		LIMIT ${limit} OFFSET ${offset}
	`);
	return rows.rows as Record<string, unknown>[];
}

export async function contarOrigensComApropriacao(
	origemtipo: OrigemTipoApropriacao,
	origemid: string,
) {
	const [row] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(schema.apropriacaocentrocusto)
		.where(
			and(
				eq(schema.apropriacaocentrocusto.origemtipo, origemtipo),
				eq(schema.apropriacaocentrocusto.origemid, origemid),
			),
		);
	return row?.total ?? 0;
}
