import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	lte,
} from "drizzle-orm";
import type { NovoDAV } from "@/model/dav-model";
import { dav } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarDavPorId(id: string) {
	const [registro] = await db.select().from(dav).where(eq(dav.id, id));

	return registro;
}

export async function criarDav(dadosDav: NovoDAV) {
	const [registro] = await db.insert(dav).values(dadosDav).returning();

	return registro;
}

export async function atualizarDav(id: string, dadosDav: Partial<NovoDAV>) {
	const [registro] = await db
		.update(dav)
		.set(dadosDav)
		.where(eq(dav.id, id))
		.returning();

	return registro;
}

export async function excluirDav(id: string) {
	const [registro] = await db.delete(dav).where(eq(dav.id, id)).returning();

	return registro;
}

export type ListarDavsParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	idcliente?: string | undefined;
	status?: number | undefined;
	faturado?: boolean | undefined;
	codigo?: number | undefined;
	busca?: string | undefined;
};

export async function listarDavs({
	idempresa,
	page = 1,
	limit = 10,
	dataInicio,
	dataFim,
	idcliente,
	status,
	faturado,
	codigo,
	busca,
}: ListarDavsParametros) {
	const where = [];

	where.push(eq(dav.idempresa, idempresa));

	if (dataInicio) {
		where.push(gte(dav.data, dataInicio));
	}

	if (dataFim) {
		where.push(lte(dav.data, dataFim));
	}

	if (idcliente) {
		where.push(eq(dav.idcliente, idcliente));
	}

	if (status !== undefined) {
		where.push(eq(dav.status, status));
	}

	if (faturado === true) {
		where.push(isNotNull(dav.idnotafiscal));
	} else if (faturado === false) {
		where.push(isNull(dav.idnotafiscal));
	}

	if (codigo !== undefined) {
		where.push(eq(dav.codigo, codigo));
	}

	if (busca?.trim()) {
		where.push(ilike(dav.nomecliente, `%${busca.trim()}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, davs] = await Promise.all([
		db
			.select({ value: count() })
			.from(dav)
			.where(and(...where)),
		db
			.select()
			.from(dav)
			.where(and(...where))
			.orderBy(desc(dav.currenttimemillis))
			.limit(limit)
			.offset(offset),
	]);

	return {
		davs,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarDavPorNotaFiscal(idnotafiscal: string) {
	const [registro] = await db
		.select()
		.from(dav)
		.where(eq(dav.idnotafiscal, idnotafiscal));

	return registro;
}

export async function listarDavsPorNotaFiscal(idnotafiscal: string) {
	return db.select().from(dav).where(eq(dav.idnotafiscal, idnotafiscal));
}

export async function buscarDavsPorIds(ids: string[]) {
	if (ids.length === 0) {
		return [];
	}

	return db.select().from(dav).where(inArray(dav.id, ids));
}
