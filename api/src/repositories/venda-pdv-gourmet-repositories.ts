import { and, count, desc, eq } from "drizzle-orm";
import type { NovaVendaPdvGourmet } from "@/model/venda-pdv-gourmet-model";
import { vendapdvgourmet } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarVendaPdvGourmetPorId(id: string) {
	const [registro] = await db
		.select()
		.from(vendapdvgourmet)
		.where(eq(vendapdvgourmet.id, id));

	return registro;
}

export async function criarVendaPdvGourmet(dadosVendaPdvGourmet: NovaVendaPdvGourmet) {
	const [registro] = await db
		.insert(vendapdvgourmet)
		.values(dadosVendaPdvGourmet)
		.returning();

	return registro;
}

export async function atualizarVendaPdvGourmet(
	id: string,
	dadosVendaPdvGourmet: Partial<NovaVendaPdvGourmet>,
) {
	const [registro] = await db
		.update(vendapdvgourmet)
		.set(dadosVendaPdvGourmet)
		.where(eq(vendapdvgourmet.id, id))
		.returning();

	return registro;
}

export async function excluirVendaPdvGourmet(id: string) {
	const [registro] = await db
		.delete(vendapdvgourmet)
		.where(eq(vendapdvgourmet.id, id))
		.returning();

	return registro;
}

export type ListarVendasPdvGourmetParametros = {
	idempresa: string;
	idcontamesa?: string | undefined;
	numeropdv?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarVendasPdvGourmet({
	idempresa,
	idcontamesa,
	numeropdv,
	page = 1,
	limit = 10,
}: ListarVendasPdvGourmetParametros) {
	const where = [eq(vendapdvgourmet.idempresa, idempresa)];

	if (idcontamesa) {
		where.push(eq(vendapdvgourmet.idcontamesa, idcontamesa));
	}

	if (numeropdv !== undefined) {
		where.push(eq(vendapdvgourmet.numeropdv, numeropdv));
	}

	const offset = (page - 1) * limit;

	const [totalCount, vendas] = await Promise.all([
		db
			.select({ value: count() })
			.from(vendapdvgourmet)
			.where(and(...where)),
		db
			.select()
			.from(vendapdvgourmet)
			.where(and(...where))
			.orderBy(desc(vendapdvgourmet.datacriacao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		vendas,
		total: totalCount[0]?.value ?? 0,
	};
}
