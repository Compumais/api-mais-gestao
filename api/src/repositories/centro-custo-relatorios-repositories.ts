import { sql } from "drizzle-orm";
import type { RegimeApropriacao } from "@/constants/centro-custo.js";
import { db } from "./connection.js";

function parseNum(value: unknown) {
	if (value === null || value === undefined) return 0;
	return Number(value);
}

export async function buscarTotaisCentroCustosPorPeriodo({
	idempresa,
	dataInicio,
	dataFim,
	regime,
	idcentrocusto,
}: {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	regime: RegimeApropriacao;
	idcentrocusto?: string;
}) {
	const filtroCentro = idcentrocusto
		? sql`AND a.idcentrocusto = ${idcentrocusto}`
		: sql``;
	const rows = await db.execute(sql`
		SELECT
			c.codigoreduzido AS codigo,
			c.nome AS nome,
			c.id AS idcentrocusto,
			COALESCE(SUM(a.valor), 0) AS total_despesas
		FROM centrocusto c
		LEFT JOIN apropriacao_centro_custo a
			ON a.idcentrocusto = c.id
			AND a.idempresa = ${idempresa}
			AND a.regime = ${regime}
			AND a.datalancamento BETWEEN ${dataInicio} AND ${dataFim}
		WHERE c.idempresa = ${idempresa}
			AND COALESCE(c.inativo, 0) = 0
			${filtroCentro}
		GROUP BY c.id, c.codigoreduzido, c.nome
		ORDER BY c.codigoreduzido NULLS LAST, c.nome
	`);
	return (rows.rows as Record<string, unknown>[]).map((row) => ({
		idcentrocusto: String(row.idcentrocusto),
		codigo: (row.codigo as string | null) ?? null,
		nome: String(row.nome ?? "-"),
		totalDespesas: parseNum(row.total_despesas),
		totalReceitas: 0,
		saldo: -parseNum(row.total_despesas),
	}));
}

export async function buscarComparativoMensalCentroCustos({
	idempresa,
	dataInicio,
	dataFim,
	regime,
}: {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	regime: RegimeApropriacao;
}) {
	const rows = await db.execute(sql`
		SELECT
			to_char(a.datalancamento, 'YYYY-MM') AS mes,
			a.idcentrocusto,
			c.nome AS centrocustonome,
			COALESCE(SUM(a.valor), 0) AS total
		FROM apropriacao_centro_custo a
		INNER JOIN centrocusto c ON c.id = a.idcentrocusto
		WHERE a.idempresa = ${idempresa}
			AND a.regime = ${regime}
			AND a.datalancamento BETWEEN ${dataInicio} AND ${dataFim}
		GROUP BY 1, 2, 3
		ORDER BY 1, 3
	`);
	return rows.rows as Record<string, unknown>[];
}

export async function buscarComposicaoCentroCustos({
	idempresa,
	dataInicio,
	dataFim,
	regime,
	idcentrocusto,
}: {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	regime: RegimeApropriacao;
	idcentrocusto?: string;
}) {
	const filtroCentro = idcentrocusto
		? sql`AND a.idcentrocusto = ${idcentrocusto}`
		: sql``;
	const rows = await db.execute(sql`
		SELECT
			a.idcentrocusto,
			c.nome AS centrocustonome,
			p.codigo AS planocontascodigo,
			p.nome AS planocontasnome,
			COALESCE(SUM(a.valor), 0) AS total
		FROM apropriacao_centro_custo a
		INNER JOIN centrocusto c ON c.id = a.idcentrocusto
		LEFT JOIN planocontas p ON p.id = a.idplanocontas
		WHERE a.idempresa = ${idempresa}
			AND a.regime = ${regime}
			AND a.datalancamento BETWEEN ${dataInicio} AND ${dataFim}
			${filtroCentro}
		GROUP BY a.idcentrocusto, c.nome, p.codigo, p.nome
		ORDER BY total DESC
	`);
	return rows.rows as Record<string, unknown>[];
}

export async function buscarRateiosCentroCustos({
	idempresa,
	dataInicio,
	dataFim,
}: {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
}) {
	const rows = await db.execute(sql`
		SELECT
			a.origemtipo,
			a.origemid,
			a.idcriteriorateio,
			cr.nome AS criterionome,
			a.idcentrocusto,
			c.nome AS centrocustonome,
			a.valor,
			a.percentual,
			a.datalancamento
		FROM apropriacao_centro_custo a
		INNER JOIN centrocusto c ON c.id = a.idcentrocusto
		LEFT JOIN criterio_rateio cr ON cr.id = a.idcriteriorateio
		WHERE a.idempresa = ${idempresa}
			AND a.datalancamento BETWEEN ${dataInicio} AND ${dataFim}
			AND (
				a.idcriteriorateio IS NOT NULL
				OR EXISTS (
					SELECT 1
					FROM apropriacao_centro_custo a2
					WHERE a2.origemtipo = a.origemtipo
						AND a2.origemid = a.origemid
						AND a2.regime = a.regime
						AND a2.id <> a.id
				)
			)
		ORDER BY a.datalancamento DESC, a.origemid
	`);
	return rows.rows as Record<string, unknown>[];
}

export async function buscarEvolucaoCentroCustos({
	idempresa,
	meses,
	regime,
	idcentrocusto,
}: {
	idempresa: string;
	meses: number;
	regime: RegimeApropriacao;
	idcentrocusto?: string;
}) {
	const filtroCentro = idcentrocusto
		? sql`AND a.idcentrocusto = ${idcentrocusto}`
		: sql``;
	const rows = await db.execute(sql`
		SELECT
			to_char(a.datalancamento, 'YYYY-MM') AS mes,
			COALESCE(SUM(a.valor), 0) AS total
		FROM apropriacao_centro_custo a
		WHERE a.idempresa = ${idempresa}
			AND a.regime = ${regime}
			AND a.datalancamento >= (CURRENT_DATE - (${meses} || ' months')::interval)
			${filtroCentro}
		GROUP BY 1
		ORDER BY 1
	`);
	return rows.rows as Record<string, unknown>[];
}
