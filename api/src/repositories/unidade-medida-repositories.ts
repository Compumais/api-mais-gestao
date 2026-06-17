import { and, asc, count, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { NovoUnidadeMedida } from "@/model/unidade-medida-model";
import { unidademedida } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarUnidadeMedidaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(unidademedida)
		.where(eq(unidademedida.id, id));

	return registro;
}

export async function criarUnidadeMedida(
	dadosUnidadeMedida: NovoUnidadeMedida,
) {
	const [registro] = await db
		.insert(unidademedida)
		.values(dadosUnidadeMedida)
		.returning();

	return registro;
}

export async function atualizarUnidadeMedida(
	id: string,
	dadosUnidadeMedida: Partial<NovoUnidadeMedida>,
) {
	const [registro] = await db
		.update(unidademedida)
		.set(dadosUnidadeMedida)
		.where(eq(unidademedida.id, id))
		.returning();

	return registro;
}

export async function excluirUnidadeMedida(id: string) {
	const [registro] = await db
		.delete(unidademedida)
		.where(eq(unidademedida.id, id))
		.returning();

	return registro;
}

export type ListarUnidadesMedidaParametros = {
	idempresa: string;
	nome?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarUnidadesMedida({
	idempresa,
	nome,
	page = 1,
	limit = 10,
}: ListarUnidadesMedidaParametros) {
	const where = [
		or(eq(unidademedida.idempresa, idempresa), isNull(unidademedida.idempresa)),
	];

	if (nome) {
		where.push(ilike(unidademedida.nome, `%${nome}%`));
	}

	const offset = (page - 1) * limit;
	const filtro = and(...where);

	const [totalCount, unidadesmedida] = await Promise.all([
		db.select({ value: count() }).from(unidademedida).where(filtro),
		db
			.select()
			.from(unidademedida)
			.where(filtro)
			.orderBy(
				asc(sql`CASE WHEN ${unidademedida.idempresa} IS NULL THEN 0 ELSE 1 END`),
				asc(unidademedida.nome),
			)
			.limit(limit)
			.offset(offset),
	]);

	return {
		unidadesmedida,
		total: totalCount[0]?.value ?? 0,
	};
}
