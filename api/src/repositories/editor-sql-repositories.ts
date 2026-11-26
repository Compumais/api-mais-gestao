import { and, desc, eq } from "drizzle-orm";
import type { BiLayoutItem } from "../../drizzle/tables/bi-dashboard-layout.js";
import type {
	BiMapeamentoGrafico,
	BiTipoGrafico,
} from "../../drizzle/tables/bi-widget.js";
import * as schema from "../../drizzle/schema.js";
import { biReadOnlyPool, db } from "./connection.js";

export type BiColunaSchema = {
	nome: string;
	tipo: string;
};

export type BiViewSchema = {
	nome: string;
	colunas: BiColunaSchema[];
};

export type ResultadoExecucaoSqlBi = {
	colunas: string[];
	linhas: Record<string, unknown>[];
	totalRetornado: number;
	truncado: boolean;
	duracaoMs: number;
};

export async function listarSchemaRelatorios(): Promise<BiViewSchema[]> {
	const result = await biReadOnlyPool.query<{
		table_name: string;
		column_name: string;
		data_type: string;
	}>(`
		SELECT table_name, column_name, data_type
		FROM information_schema.columns
		WHERE table_schema = 'relatorios'
		ORDER BY table_name ASC, ordinal_position ASC
	`);

	const mapa = new Map<string, BiColunaSchema[]>();
	for (const row of result.rows) {
		const lista = mapa.get(row.table_name) ?? [];
		lista.push({ nome: row.column_name, tipo: row.data_type });
		mapa.set(row.table_name, lista);
	}

	return Array.from(mapa.entries()).map(([nome, colunas]) => ({
		nome,
		colunas,
	}));
}

export async function executarSqlBi(params: {
	idempresa: string;
	sqlParametrizado: string;
	valores: unknown[];
	limiteLinhas?: number;
	timeoutMs?: number;
}): Promise<ResultadoExecucaoSqlBi> {
	const limite = Math.min(Math.max(params.limiteLinhas ?? 500, 1), 1000);
	const timeoutMs = Math.min(Math.max(params.timeoutMs ?? 5000, 500), 10_000);

	const client = await biReadOnlyPool.connect();
	const inicio = Date.now();

	try {
		await client.query("BEGIN TRANSACTION READ ONLY");
		await client.query("SET LOCAL search_path = relatorios");
		await client.query(`SET LOCAL statement_timeout = '${timeoutMs}'`);
		await client.query("SELECT set_config('app.empresa_id', $1, true)", [
			params.idempresa,
		]);

		const sqlEnvolvido = `SELECT * FROM (${params.sqlParametrizado}) AS _bi_subquery LIMIT ${limite + 1}`;
		const resultado = await client.query(sqlEnvolvido, params.valores);
		const duracaoMs = Date.now() - inicio;

		const truncado = resultado.rows.length > limite;
		const linhas = truncado
			? resultado.rows.slice(0, limite)
			: resultado.rows;
		const colunas = resultado.fields.map((f) => f.name);

		return {
			colunas,
			linhas,
			totalRetornado: linhas.length,
			truncado,
			duracaoMs,
		};
	} finally {
		await client.query("ROLLBACK").catch(() => undefined);
		client.release();
	}
}

// --- Consultas Salvas ---

export async function listarConsultasBiPorEmpresa(idempresa: string) {
	return db
		.select()
		.from(schema.biConsultas)
		.where(eq(schema.biConsultas.idempresa, idempresa))
		.orderBy(desc(schema.biConsultas.atualizadoem));
}

export async function buscarConsultaBiPorId(idempresa: string, id: string) {
	const rows = await db
		.select()
		.from(schema.biConsultas)
		.where(
			and(
				eq(schema.biConsultas.id, id),
				eq(schema.biConsultas.idempresa, idempresa),
			),
		)
		.limit(1);
	return rows[0] ?? null;
}

export async function criarConsultaBi(
	dados: typeof schema.biConsultas.$inferInsert,
) {
	const rows = await db.insert(schema.biConsultas).values(dados).returning();
	return rows[0] ?? null;
}

export async function atualizarConsultaBi(
	idempresa: string,
	id: string,
	dados: Partial<typeof schema.biConsultas.$inferInsert>,
) {
	const rows = await db
		.update(schema.biConsultas)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(
			and(
				eq(schema.biConsultas.id, id),
				eq(schema.biConsultas.idempresa, idempresa),
			),
		)
		.returning();
	return rows[0] ?? null;
}

export async function excluirConsultaBi(idempresa: string, id: string) {
	const rows = await db
		.delete(schema.biConsultas)
		.where(
			and(
				eq(schema.biConsultas.id, id),
				eq(schema.biConsultas.idempresa, idempresa),
			),
		)
		.returning();
	return rows[0] ?? null;
}

// --- Widgets ---

export async function listarWidgetsBiPorEmpresa(idempresa: string) {
	return db
		.select({
			widget: schema.biWidgets,
			consulta: schema.biConsultas,
		})
		.from(schema.biWidgets)
		.innerJoin(
			schema.biConsultas,
			eq(schema.biWidgets.idconsulta, schema.biConsultas.id),
		)
		.where(eq(schema.biWidgets.idempresa, idempresa))
		.orderBy(desc(schema.biWidgets.criadoem));
}

export async function buscarWidgetBiComConsulta(idempresa: string, id: string) {
	const rows = await db
		.select({
			widget: schema.biWidgets,
			consulta: schema.biConsultas,
		})
		.from(schema.biWidgets)
		.innerJoin(
			schema.biConsultas,
			eq(schema.biWidgets.idconsulta, schema.biConsultas.id),
		)
		.where(
			and(
				eq(schema.biWidgets.id, id),
				eq(schema.biWidgets.idempresa, idempresa),
			),
		)
		.limit(1);
	return rows[0] ?? null;
}

export async function criarWidgetBi(
	dados: typeof schema.biWidgets.$inferInsert,
) {
	const rows = await db.insert(schema.biWidgets).values(dados).returning();
	return rows[0] ?? null;
}

export async function atualizarWidgetBi(
	idempresa: string,
	id: string,
	dados: Partial<{
		titulo: string;
		subtitulo: string | null;
		tipografico: BiTipoGrafico;
		mapeamento: BiMapeamentoGrafico;
		cachettlsegundos: number;
	}>,
) {
	const rows = await db
		.update(schema.biWidgets)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(
			and(
				eq(schema.biWidgets.id, id),
				eq(schema.biWidgets.idempresa, idempresa),
			),
		)
		.returning();
	return rows[0] ?? null;
}

export async function excluirWidgetBi(idempresa: string, id: string) {
	const rows = await db
		.delete(schema.biWidgets)
		.where(
			and(
				eq(schema.biWidgets.id, id),
				eq(schema.biWidgets.idempresa, idempresa),
			),
		)
		.returning();
	return rows[0] ?? null;
}

// --- Layout do Dashboard Personalizado ---

export async function buscarLayoutDashboardBi(idempresa: string) {
	const rows = await db
		.select()
		.from(schema.biDashboardLayouts)
		.where(eq(schema.biDashboardLayouts.idempresa, idempresa))
		.limit(1);
	return rows[0] ?? null;
}

export async function upsertLayoutDashboardBi(params: {
	idempresa: string;
	nome?: string;
	itens: BiLayoutItem[];
	atualizadopor?: string | null;
}) {
	const existente = await buscarLayoutDashboardBi(params.idempresa);
	const agora = new Date().toISOString();

	if (existente) {
		const rows = await db
			.update(schema.biDashboardLayouts)
			.set({
				...(params.nome ? { nome: params.nome } : {}),
				itens: params.itens,
				atualizadopor: params.atualizadopor ?? null,
				atualizadoem: agora,
			})
			.where(eq(schema.biDashboardLayouts.id, existente.id))
			.returning();
		return rows[0] ?? null;
	}

	const rows = await db
		.insert(schema.biDashboardLayouts)
		.values({
			idempresa: params.idempresa,
			nome: params.nome ?? "Meu Painel",
			itens: params.itens,
			atualizadopor: params.atualizadopor ?? null,
			atualizadoem: agora,
		})
		.returning();
	return rows[0] ?? null;
}
