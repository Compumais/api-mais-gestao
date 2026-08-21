import { eq, inArray } from "drizzle-orm";
import type { NovoDavItemLote } from "@/model/dav-item-lote-model.js";
import * as schema from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function listarLotesPorDavItem(iddavitem: string) {
	return db
		.select()
		.from(schema.davitemlote)
		.where(eq(schema.davitemlote.iddavitem, iddavitem));
}

export async function listarLotesPorDavItens(iddavitens: string[]) {
	if (iddavitens.length === 0) return [];
	return db
		.select()
		.from(schema.davitemlote)
		.where(inArray(schema.davitemlote.iddavitem, iddavitens));
}

export async function criarDavItemLote(dados: NovoDavItemLote) {
	const [registro] = await db
		.insert(schema.davitemlote)
		.values(dados)
		.returning();
	return registro;
}

export async function excluirLotesPorDavItem(iddavitem: string) {
	await db
		.delete(schema.davitemlote)
		.where(eq(schema.davitemlote.iddavitem, iddavitem));
}
