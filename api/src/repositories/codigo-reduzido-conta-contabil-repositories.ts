import { and, count, desc, eq } from "drizzle-orm";
import type { NovoCodigoReduzidoContaContabil } from "@/model/codigo-reduzido-conta-contabil-model";
import { codigoreduzidocontacontabil } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarCodigoReduzidoContaContabilPorId(id: string) {
	const [registro] = await db
		.select()
		.from(codigoreduzidocontacontabil)
		.where(eq(codigoreduzidocontacontabil.id, id));

	return registro;
}

export async function criarCodigoReduzidoContaContabil(
	dadosCodigoReduzidoContaContabil: NovoCodigoReduzidoContaContabil,
) {
	const [registro] = await db
		.insert(codigoreduzidocontacontabil)
		.values(dadosCodigoReduzidoContaContabil)
		.returning();

	return registro;
}

export async function atualizarCodigoReduzidoContaContabil(
	id: string,
	dadosCodigoReduzidoContaContabil: Partial<NovoCodigoReduzidoContaContabil>,
) {
	const [registro] = await db
		.update(codigoreduzidocontacontabil)
		.set(dadosCodigoReduzidoContaContabil)
		.where(eq(codigoreduzidocontacontabil.id, id))
		.returning();

	return registro;
}

export async function excluirCodigoReduzidoContaContabil(id: string) {
	const [registro] = await db
		.delete(codigoreduzidocontacontabil)
		.where(eq(codigoreduzidocontacontabil.id, id))
		.returning();

	return registro;
}

export type ListarCodigosReduzidosContaContabilParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
};

export async function listarCodigosReduzidosContaContabil({
	idempresa,
	page = 1,
	limit = 10,
}: ListarCodigosReduzidosContaContabilParametros) {
	const where = [];

	where.push(eq(codigoreduzidocontacontabil.idempresa, idempresa));

	const offset = (page - 1) * limit;

	const [totalCount, codigosreduzidoscontacontabil] = await Promise.all([
		db
			.select({ value: count() })
			.from(codigoreduzidocontacontabil)
			.where(and(...where)),
		db
			.select()
			.from(codigoreduzidocontacontabil)
			.where(and(...where))
			.orderBy(desc(codigoreduzidocontacontabil.datacadastro))
			.limit(limit)
			.offset(offset),
	]);

	return {
		codigosreduzidoscontacontabil,
		total: totalCount[0]?.value ?? 0,
	};
}
