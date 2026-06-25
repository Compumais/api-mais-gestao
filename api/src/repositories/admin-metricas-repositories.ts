import { sql } from "drizzle-orm";
import {
	type TipoPlano,
	VALORES_PLANOS,
} from "@/constants/planos.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

function valorPlano(plano: string | null): number {
	if (!plano) return 0;
	return VALORES_PLANOS[plano as TipoPlano] ?? 0;
}

export async function buscarMetricasDashboardAdmin() {
	const [usuariosRow] = await db
		.select({ total: sql<number>`COUNT(*)::int` })
		.from(schema.usuarios);

	const [empresasRow] = await db
		.select({ total: sql<number>`COUNT(*)::int` })
		.from(schema.empresa);

	const [assinantesRow] = await db
		.select({ total: sql<number>`COUNT(*)::int` })
		.from(schema.usuarios)
		.where(sql`${schema.usuarios.plano} IS NOT NULL`);

	const assinantes = await db
		.select({
			plano: schema.usuarios.plano,
		})
		.from(schema.usuarios)
		.where(sql`${schema.usuarios.plano} IS NOT NULL`);

	const faturamentoMesAtual = assinantes.reduce(
		(acc, item) => acc + valorPlano(item.plano),
		0,
	);

	const anoAtual = new Date().getFullYear();

	const faturamentoMensal = await Promise.all(
		Array.from({ length: 12 }, async (_, indice) => {
			const mes = indice + 1;
			const fimMes = new Date(anoAtual, mes, 0, 23, 59, 59);

			const rows = await db
				.select({ plano: schema.usuarios.plano })
				.from(schema.usuarios)
				.where(
					sql`${schema.usuarios.plano} IS NOT NULL AND ${schema.usuarios.criadoem} <= ${fimMes.toISOString()}`,
				);

			const valor = rows.reduce((acc, row) => acc + valorPlano(row.plano), 0);

			return {
				mes,
				label: new Date(anoAtual, indice, 1).toLocaleDateString("pt-BR", {
					month: "short",
				}),
				valor,
			};
		}),
	);

	const topAssinantes = await db
		.select({
			id: schema.usuarios.id,
			nome: schema.usuarios.nome,
			email: schema.usuarios.email,
			plano: schema.usuarios.plano,
			criadoem: schema.usuarios.criadoem,
		})
		.from(schema.usuarios)
		.where(sql`${schema.usuarios.plano} IS NOT NULL`)
		.orderBy(sql`${schema.usuarios.criadoem} ASC`)
		.limit(5);

	const topEmpresas = await db.execute(sql`
		WITH contagens AS (
			SELECT e.id, e.nome,
				(SELECT COUNT(*)::int FROM financeiro f WHERE f.idempresa = e.id) +
				(SELECT COUNT(*)::int FROM entidade en WHERE en.idempresa = e.id) +
				(SELECT COUNT(*)::int FROM produtos p WHERE p.idempresa = e.id) +
				(SELECT COUNT(*)::int FROM contacorrentelancamento ccl
					INNER JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
					WHERE cc.idempresa = e.id) AS total
			FROM empresas e
		)
		SELECT id, nome, total
		FROM contagens
		ORDER BY total DESC
		LIMIT 5
	`);

	const topEmpresasRows = (topEmpresas.rows ?? topEmpresas) as {
		id: string;
		nome: string;
		total: number;
	}[];

	return {
		totalUsuarios: usuariosRow?.total ?? 0,
		totalEmpresas: empresasRow?.total ?? 0,
		totalPagamentos: assinantesRow?.total ?? 0,
		faturamentoMesAtual,
		faturamentoMensal,
		topAssinantes: topAssinantes.map((item) => ({
			id: item.id,
			nome: item.nome,
			email: item.email,
			plano: item.plano,
			desde: item.criadoem,
		})),
		topEmpresas: topEmpresasRows.map((item) => ({
			id: item.id,
			nome: item.nome,
			totalRegistros: Number(item.total ?? 0),
		})),
	};
}
