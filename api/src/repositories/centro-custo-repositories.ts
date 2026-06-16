import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoCentroCusto } from "@/model/centro-custo-model";
import { centrocusto } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarCentroCustoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(centrocusto)
		.where(eq(centrocusto.id, id));

	return registro;
}

export async function criarCentroCusto(dadosCentroCusto: NovoCentroCusto) {
	const [registro] = await db
		.insert(centrocusto)
		.values(dadosCentroCusto)
		.returning();

	return registro;
}

export async function atualizarCentroCusto(
	id: string,
	dadosCentroCusto: Partial<NovoCentroCusto>,
) {
	const [registro] = await db
		.update(centrocusto)
		.set(dadosCentroCusto)
		.where(eq(centrocusto.id, id))
		.returning();

	return registro;
}

export async function excluirCentroCusto(id: string) {
	const [registro] = await db
		.delete(centrocusto)
		.where(eq(centrocusto.id, id))
		.returning();

	return registro;
}

export type ListarCentrosCustoParametros = {
	idempresa: string;
	nome?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarCentrosCusto({
	idempresa,
	nome,
	inativo,
	page = 1,
	limit = 10,
}: ListarCentrosCustoParametros) {
	const where = [];

	where.push(eq(centrocusto.idempresa, idempresa));

	if (nome) {
		where.push(ilike(centrocusto.nome, `%${nome}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(centrocusto.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, centrocustos] = await Promise.all([
		db
			.select({ value: count() })
			.from(centrocusto)
			.where(and(...where)),
		db
			.select()
			.from(centrocusto)
			.where(and(...where))
			.orderBy(desc(centrocusto.nome))
			.limit(limit)
			.offset(offset),
	]);

	return {
		centrocustos,
		total: totalCount[0]?.value ?? 0,
	};
}
