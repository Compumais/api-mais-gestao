import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoArea } from "@/model/area-model";
import { area } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarAreaPorId(id: string) {
	const [registro] = await db.select().from(area).where(eq(area.id, id));

	return registro;
}

export async function criarArea(dadosArea: NovoArea) {
	const [registro] = await db.insert(area).values(dadosArea).returning();

	return registro;
}

export async function atualizarArea(id: string, dadosArea: Partial<NovoArea>) {
	const [registro] = await db
		.update(area)
		.set(dadosArea)
		.where(eq(area.id, id))
		.returning();

	return registro;
}

export async function excluirArea(id: string) {
	const [registro] = await db.delete(area).where(eq(area.id, id)).returning();

	return registro;
}

export type ListarAreasParametros = {
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarAreas({
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarAreasParametros) {
	const where = [];

	where.push(eq(area.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(area.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(area.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, areas] = await Promise.all([
		db
			.select({ value: count() })
			.from(area)
			.where(and(...where)),
		db
			.select()
			.from(area)
			.where(and(...where))
			.orderBy(desc(area.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		areas,
		total: totalCount[0]?.value ?? 0,
	};
}
