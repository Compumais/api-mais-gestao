import { and, count, desc, eq } from "drizzle-orm";
import type { NovoVendaPdvItem } from "@/model/venda-pdv-item-model";
import { vendapdvitem } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarVendaPdvItemPorId(id: string) {
	const [registro] = await db
		.select()
		.from(vendapdvitem)
		.where(eq(vendapdvitem.id, id));

	return registro;
}

export async function criarVendaPdvItem(dadosVendaPdvItem: NovoVendaPdvItem) {
	const [registro] = await db
		.insert(vendapdvitem)
		.values(dadosVendaPdvItem)
		.returning();

	return registro;
}

export async function atualizarVendaPdvItem(
	id: string,
	dadosVendaPdvItem: Partial<NovoVendaPdvItem>,
) {
	const [registro] = await db
		.update(vendapdvitem)
		.set(dadosVendaPdvItem)
		.where(eq(vendapdvitem.id, id))
		.returning();

	return registro;
}

export async function excluirVendaPdvItem(id: string) {
	const [registro] = await db
		.delete(vendapdvitem)
		.where(eq(vendapdvitem.id, id))
		.returning();

	return registro;
}

export type ListarVendasPdvItemParametros = {
	idempresa: string;
	idvenda?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarVendasPdvItem({
	idempresa,
	idvenda,
	page = 1,
	limit = 10,
}: ListarVendasPdvItemParametros) {
	const where = [eq(vendapdvitem.idempresa, idempresa)];

	if (idvenda) {
		where.push(eq(vendapdvitem.idvenda, idvenda));
	}

	const offset = (page - 1) * limit;

	const [totalCount, itens] = await Promise.all([
		db
			.select({ value: count() })
			.from(vendapdvitem)
			.where(and(...where)),
		db
			.select()
			.from(vendapdvitem)
			.where(and(...where))
			.orderBy(desc(vendapdvitem.id))
			.limit(limit)
			.offset(offset),
	]);

	return {
		itens,
		total: totalCount[0]?.value ?? 0,
	};
}
