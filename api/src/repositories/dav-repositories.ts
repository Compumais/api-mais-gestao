import { and, count, desc, eq } from "drizzle-orm";
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
};

export async function listarDavs({
	idempresa,
	page = 1,
	limit = 10,
}: ListarDavsParametros) {
	const where = [];

	where.push(eq(dav.idempresa, idempresa));

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
