import { and, asc, eq, isNull, or } from "drizzle-orm";
import type { NovoDavItem } from "@/model/dav-item-model.js";
import { davitem } from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function buscarDavItemPorId(id: string) {
	const [registro] = await db
		.select()
		.from(davitem)
		.where(eq(davitem.id, id));

	return registro;
}

export async function listarItensPorDav(iddav: string) {
	return db
		.select()
		.from(davitem)
		.where(
			and(
				eq(davitem.iddav, iddav),
				or(eq(davitem.cancelado, 0), isNull(davitem.cancelado)),
			),
		)
		.orderBy(asc(davitem.id));
}

export async function criarDavItem(dados: NovoDavItem) {
	const [registro] = await db.insert(davitem).values(dados).returning();
	return registro;
}

export async function atualizarDavItem(id: string, dados: Partial<NovoDavItem>) {
	const [registro] = await db
		.update(davitem)
		.set(dados)
		.where(eq(davitem.id, id))
		.returning();

	return registro;
}

export async function excluirDavItem(id: string) {
	const [registro] = await db
		.delete(davitem)
		.where(eq(davitem.id, id))
		.returning();

	return registro;
}
