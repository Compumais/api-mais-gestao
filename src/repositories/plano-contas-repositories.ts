import { and, eq, isNull, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type PlanoContas = typeof schema.planocontas.$inferSelect;
export type NovoPlanoContas = typeof schema.planocontas.$inferInsert;

export async function criarPlanoContas(dadosPlanoContas: NovoPlanoContas) {
	const planoContas = await db
		.insert(schema.planocontas)
		.values(dadosPlanoContas)
		.returning();

	return planoContas[0];
}

export async function excluirPlanoContas({ id }: { id: string }) {
	const [planocontas] = await db
		.delete(schema.planocontas)
		.where(eq(schema.planocontas.id, id))
		.returning();

	return planocontas;
}

export async function buscarPlanoContasPorId(id: string) {
	const [planoContas] = await db
		.select()
		.from(schema.planocontas)
		.where(eq(schema.planocontas.id, id))
		.limit(1);

	return planoContas;
}

export async function buscarProximoCodigoSemPai(empresaId: string) {
	const resultado = await db
		.select({
			count: sql<number>`count(*)::int`,
		})
		.from(schema.planocontas)
		.where(
			and(
				eq(schema.planocontas.empresaId, empresaId),
				isNull(schema.planocontas.planoContasId),
			),
		);

	const count = resultado[0]?.count ?? 0;
	return (count + 1).toString();
}

export async function buscarProximoCodigoComPai(
	empresaId: string,
	planoContasId: string,
) {
	const resultado = await db
		.select({
			count: sql<number>`count(*)::int`,
		})
		.from(schema.planocontas)
		.where(
			and(
				eq(schema.planocontas.empresaId, empresaId),
				eq(schema.planocontas.planoContasId, planoContasId),
			),
		);

	const count = resultado[0]?.count ?? 0;
	return (count + 1).toString();
}
