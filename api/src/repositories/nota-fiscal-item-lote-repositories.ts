import { and, eq, inArray } from "drizzle-orm";
import type { NovoNotaFiscalItemLote } from "@/model/lote-model.js";
import { notafiscalitemlote } from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function criarNotaFiscalItemLotes(
	registros: NovoNotaFiscalItemLote[],
) {
	if (registros.length === 0) return [];

	return db.insert(notafiscalitemlote).values(registros).returning();
}

export async function listarLotesPorItemNota(idnotafiscalitem: string) {
	return db
		.select()
		.from(notafiscalitemlote)
		.where(eq(notafiscalitemlote.idnotafiscalitem, idnotafiscalitem));
}

export async function listarLotesPorItensNota(idsItens: string[]) {
	if (idsItens.length === 0) return [];

	return db
		.select()
		.from(notafiscalitemlote)
		.where(inArray(notafiscalitemlote.idnotafiscalitem, idsItens));
}

export async function excluirLotesPorItensNota(idsItens: string[]) {
	if (idsItens.length === 0) return;

	await db
		.delete(notafiscalitemlote)
		.where(inArray(notafiscalitemlote.idnotafiscalitem, idsItens));
}

export async function substituirLotesItemNota(
	idnotafiscalitem: string,
	idempresa: string,
	registros: NovoNotaFiscalItemLote[],
) {
	await db
		.delete(notafiscalitemlote)
		.where(
			and(
				eq(notafiscalitemlote.idnotafiscalitem, idnotafiscalitem),
				eq(notafiscalitemlote.idempresa, idempresa),
			),
		);

	if (registros.length === 0) return [];

	return criarNotaFiscalItemLotes(registros);
}
