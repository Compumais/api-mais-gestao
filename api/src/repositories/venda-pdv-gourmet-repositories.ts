import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import type { NovaVendaPdvGourmet } from "@/model/venda-pdv-gourmet-model";
import { vendapdvgourmet } from "@/repositories/schema.js";
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
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarVendasPdvGourmet({
	idempresa,
	idcontamesa,
	numeropdv,
	dataInicio,
	dataFim,
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

	if (dataInicio) {
		const inicio = /^\d{4}-\d{2}-\d{2}$/.test(dataInicio)
			? `${dataInicio} 00:00:00.000`
			: dataInicio.replace("T", " ").replace(/Z$/, "");
		where.push(gte(vendapdvgourmet.datacriacao, inicio));
	}

	if (dataFim) {
		where.push(lte(vendapdvgourmet.datacriacao, `${dataFim} 23:59:59.999`));
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

export async function listarTodasVendasPdvGourmetTurno({
	idempresa,
	numeropdv,
	dataInicio,
}: {
	idempresa: string;
	numeropdv: number;
	dataInicio?: string | Date | null;
}) {
	const where = [
		eq(vendapdvgourmet.idempresa, idempresa),
		eq(vendapdvgourmet.numeropdv, numeropdv),
	];

	if (dataInicio) {
		const inicio =
			dataInicio instanceof Date
				? dataInicio.toISOString().replace("T", " ").replace(/Z$/, "")
				: /^\d{4}-\d{2}-\d{2}$/.test(dataInicio)
					? `${dataInicio} 00:00:00.000`
					: dataInicio.replace("T", " ").replace(/Z$/, "");
		where.push(gte(vendapdvgourmet.datacriacao, inicio));
	}

	return db
		.select()
		.from(vendapdvgourmet)
		.where(and(...where))
		.orderBy(desc(vendapdvgourmet.datacriacao));
}
