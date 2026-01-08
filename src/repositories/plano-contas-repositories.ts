import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
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

export type ListarPlanoContasParametros = {
	empresaIds: string[];
	page?: number;
	limit?: number;
};

export async function listarPlanoContasPorEmpresas({
	empresaIds,
	page = 1,
	limit = 10,
}: ListarPlanoContasParametros) {
	const where = [];

	if (empresaIds.length === 0) {
		return {
			planosContas: [],
			total: 0,
		};
	}

	where.push(inArray(schema.planocontas.empresaId, empresaIds));

	const offset = (page - 1) * limit;

	const [totalCount, planosContas] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.planocontas)
			.where(and(...where)),
		db
			.select()
			.from(schema.planocontas)
			.where(and(...where))
			.orderBy(schema.planocontas.codigo)
			.limit(limit)
			.offset(offset),
	]);

	return {
		planosContas,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarPlanosFilhos(planoContasId: string) {
	const planosFilhos = await db
		.select()
		.from(schema.planocontas)
		.where(eq(schema.planocontas.planoContasId, planoContasId));

	return planosFilhos;
}

export async function buscarPlanoContasComFilhos(id: string): Promise<{
	plano: PlanoContas | undefined;
	filhos: PlanoContas[];
}> {
	const plano = await buscarPlanoContasPorId(id);

	if (!plano) {
		return {
			plano: undefined,
			filhos: [],
		};
	}

	const filhosDiretos = await buscarPlanosFilhos(id);
	const todosFilhos: PlanoContas[] = [...filhosDiretos];

	// Busca recursiva dos filhos
	for (const filho of filhosDiretos) {
		const filhosRecursivos = await buscarPlanoContasComFilhos(filho.id);
		todosFilhos.push(...filhosRecursivos.filhos);
	}

	return {
		plano,
		filhos: todosFilhos,
	};
}

export async function atualizarPlanoContas(
	id: string,
	dados: Partial<NovoPlanoContas>,
) {
	const [planoContas] = await db
		.update(schema.planocontas)
		.set(dados)
		.where(eq(schema.planocontas.id, id))
		.returning();

	return planoContas;
}
