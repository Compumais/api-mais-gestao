import { and, count, desc, eq, type SQL } from "drizzle-orm";
import type {
	NovoRetornoBancario,
	NovoRetornoBancarioItem,
} from "@/model/retorno-bancario-model.js";
import {
	retornobancario,
	retornobancarioitem,
} from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function criarRetornoBancario(dados: NovoRetornoBancario) {
	const [registro] = await db.insert(retornobancario).values(dados).returning();
	return registro;
}

export async function criarRetornoBancarioItens(
	itens: NovoRetornoBancarioItem[],
) {
	if (itens.length === 0) return [];
	return db.insert(retornobancarioitem).values(itens).returning();
}

export async function buscarRetornoBancarioPorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(retornobancario)
		.where(
			and(eq(retornobancario.id, id), eq(retornobancario.idempresa, idempresa)),
		);
	return registro;
}

export async function buscarRetornoPorChecksum(
	idempresa: string,
	checksum: string,
) {
	const [registro] = await db
		.select()
		.from(retornobancario)
		.where(
			and(
				eq(retornobancario.idempresa, idempresa),
				eq(retornobancario.checksum, checksum),
			),
		);
	return registro;
}

export async function listarItensRetorno(idretorno: string) {
	return db
		.select()
		.from(retornobancarioitem)
		.where(eq(retornobancarioitem.idretorno, idretorno))
		.orderBy(desc(retornobancarioitem.criadoem));
}

export async function atualizarRetornoBancario(
	id: string,
	dados: Partial<NovoRetornoBancario>,
) {
	const [registro] = await db
		.update(retornobancario)
		.set(dados)
		.where(eq(retornobancario.id, id))
		.returning();
	return registro;
}

export async function atualizarRetornoBancarioItem(
	id: string,
	dados: Partial<NovoRetornoBancarioItem>,
) {
	const [registro] = await db
		.update(retornobancarioitem)
		.set(dados)
		.where(eq(retornobancarioitem.id, id))
		.returning();
	return registro;
}

export type ListarRetornosParametros = {
	idempresa: string;
	idcontacorrente?: string | undefined;
	status?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarRetornosBancarios({
	idempresa,
	idcontacorrente,
	status,
	page = 1,
	limit = 20,
}: ListarRetornosParametros) {
	const where: SQL[] = [eq(retornobancario.idempresa, idempresa)];
	if (idcontacorrente) {
		where.push(eq(retornobancario.idcontacorrente, idcontacorrente));
	}
	if (status?.trim()) {
		where.push(eq(retornobancario.status, status.trim()));
	}

	const offset = (page - 1) * limit;
	const [totalCount, retornos] = await Promise.all([
		db
			.select({ value: count() })
			.from(retornobancario)
			.where(and(...where)),
		db
			.select()
			.from(retornobancario)
			.where(and(...where))
			.orderBy(desc(retornobancario.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		retornos,
		total: totalCount[0]?.value ?? 0,
	};
}
