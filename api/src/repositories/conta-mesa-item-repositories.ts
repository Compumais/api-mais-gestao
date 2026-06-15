import { and, count, desc, eq } from "drizzle-orm";
import type { NovoContaMesaItem } from "@/model/conta-mesa-item-model";
import { contamesaitem } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarContaMesaItemPorId(id: string) {
	const [registro] = await db
		.select()
		.from(contamesaitem)
		.where(eq(contamesaitem.id, id));

	return registro;
}

export async function criarContaMesaItem(dadosContaMesaItem: NovoContaMesaItem) {
	const [registro] = await db
		.insert(contamesaitem)
		.values(dadosContaMesaItem)
		.returning();

	return registro;
}

export async function atualizarContaMesaItem(
	id: string,
	dadosContaMesaItem: Partial<NovoContaMesaItem>,
) {
	const [registro] = await db
		.update(contamesaitem)
		.set(dadosContaMesaItem)
		.where(eq(contamesaitem.id, id))
		.returning();

	return registro;
}

export async function excluirContaMesaItem(id: string) {
	const [registro] = await db
		.delete(contamesaitem)
		.where(eq(contamesaitem.id, id))
		.returning();

	return registro;
}

export type ListarContasMesaItemParametros = {
	idcontamesa: string;
	page?: number;
	limit?: number;
};

export async function listarContasMesaItem({
	idcontamesa,
	page = 1,
	limit = 10,
}: ListarContasMesaItemParametros) {
	const where = [eq(contamesaitem.idcontamesa, idcontamesa)];

	const offset = (page - 1) * limit;

	const [totalCount, itens] = await Promise.all([
		db
			.select({ value: count() })
			.from(contamesaitem)
			.where(and(...where)),
		db
			.select()
			.from(contamesaitem)
			.where(and(...where))
			.orderBy(desc(contamesaitem.dataabertura))
			.limit(limit)
			.offset(offset),
	]);

	return {
		itens,
		total: totalCount[0]?.value ?? 0,
	};
}
