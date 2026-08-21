import { and, desc, eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { calcularRealizadoMeta } from "./dashboard-analytics-repositories.js";
import { db } from "./connection.js";

export type MetaDashboard = typeof schema.metasDashboard.$inferSelect;
export type NovaMetaDashboard = typeof schema.metasDashboard.$inferInsert;

export type TipoMetaDashboard =
	| "faturamento"
	| "vendas"
	| "lucro"
	| "margem"
	| "despesas";

export type MetaAcompanhamento = MetaDashboard & {
	valorRealizado: number;
	percentualAtingido: number | null;
	diferenca: number;
};

export async function listarMetas({
	idempresa,
}: {
	idempresa: string;
}): Promise<MetaDashboard[]> {
	return db
		.select()
		.from(schema.metasDashboard)
		.where(eq(schema.metasDashboard.idempresa, idempresa))
		.orderBy(desc(schema.metasDashboard.criadoem));
}

export async function buscarMetaPorId(id: string): Promise<MetaDashboard | undefined> {
	const [meta] = await db
		.select()
		.from(schema.metasDashboard)
		.where(eq(schema.metasDashboard.id, id));

	return meta;
}

export async function criarMeta(
	dados: NovaMetaDashboard,
): Promise<MetaDashboard> {
	const [meta] = await db
		.insert(schema.metasDashboard)
		.values(dados)
		.returning();

	return meta!;
}

export async function atualizarMeta(
	id: string,
	idempresa: string,
	dados: {
		tipo?: TipoMetaDashboard;
		periodoInicio?: string;
		periodoFim?: string;
		valorMeta?: string;
		atualizadoem?: string;
	},
): Promise<MetaDashboard | undefined> {
	const [meta] = await db
		.update(schema.metasDashboard)
		.set(dados)
		.where(
			and(
				eq(schema.metasDashboard.id, id),
				eq(schema.metasDashboard.idempresa, idempresa),
			),
		)
		.returning();

	return meta;
}

export async function excluirMeta(
	id: string,
	idempresa: string,
): Promise<MetaDashboard | undefined> {
	const [meta] = await db
		.delete(schema.metasDashboard)
		.where(
			and(
				eq(schema.metasDashboard.id, id),
				eq(schema.metasDashboard.idempresa, idempresa),
			),
		)
		.returning();

	return meta;
}

export async function buscarMetasAcompanhamento({
	idempresa,
}: {
	idempresa: string;
}): Promise<MetaAcompanhamento[]> {
	const metas = await listarMetas({ idempresa });

	const acompanhamentos = await Promise.all(
		metas.map(async (meta) => {
			const valorRealizado = await calcularRealizadoMeta({
				idempresa,
				tipo: meta.tipo,
				dataInicioStr: meta.periodoInicio,
				dataFimStr: meta.periodoFim,
			});
			const valorMeta = Number(meta.valorMeta) || 0;
			const percentualAtingido =
				valorMeta !== 0 ? (valorRealizado / valorMeta) * 100 : null;

			return {
				...meta,
				valorRealizado,
				percentualAtingido,
				diferenca: valorRealizado - valorMeta,
			};
		}),
	);

	return acompanhamentos;
}
