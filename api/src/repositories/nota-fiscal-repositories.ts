import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model";
import { notafiscal, notafiscalitem } from "@/repositories/schema.js";
import { db } from "./connection";

export async function criarNotaFiscalComItens(
	notaFiscal: NovaNotaFiscal,
	itens: NovoNotaFiscalItem[],
) {
	return db.transaction(async (tx) => {
		const [notaCriada] = await tx
			.insert(notafiscal)
			.values(notaFiscal)
			.returning();

		if (!notaCriada) {
			return { notaFiscal: null, itens: [] };
		}

		const itensCriados =
			itens.length > 0
				? await tx.insert(notafiscalitem).values(itens).returning()
				: [];

		return { notaFiscal: notaCriada, itens: itensCriados };
	});
}

export async function buscarNotaFiscalPorId(id: string) {
	const [registro] = await db
		.select()
		.from(notafiscal)
		.where(eq(notafiscal.id, id))
		.limit(1);

	return registro;
}

export async function listarItensPorNotaFiscal(idnotafiscal: string) {
	return db
		.select()
		.from(notafiscalitem)
		.where(eq(notafiscalitem.idnotafiscal, idnotafiscal))
		.orderBy(notafiscalitem.contador);
}

export type ListarNotasFiscaisPorEmpresaParametros = {
	idempresa: string;
	numero?: string | undefined;
	identidade?: string | undefined;
	status?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarNotasFiscaisPorEmpresa({
	idempresa,
	numero,
	identidade,
	status,
	page = 1,
	limit = 10,
}: ListarNotasFiscaisPorEmpresaParametros) {
	const where = [eq(notafiscal.idempresa, idempresa)];

	if (numero) {
		where.push(ilike(notafiscal.numero, `%${numero}%`));
	}

	if (identidade) {
		where.push(eq(notafiscal.identidade, identidade));
	}

	if (status !== undefined) {
		where.push(eq(notafiscal.status, status));
	}

	const offset = (page - 1) * limit;

	const [totalCount, notas] = await Promise.all([
		db
			.select({ value: count() })
			.from(notafiscal)
			.where(and(...where)),
		db
			.select()
			.from(notafiscal)
			.where(and(...where))
			.orderBy(desc(notafiscal.datainclusao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		notas,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function atualizarNotaFiscal(
	id: string,
	dados: Partial<NovaNotaFiscal>,
) {
	const [registro] = await db
		.update(notafiscal)
		.set(dados)
		.where(eq(notafiscal.id, id))
		.returning();

	return registro;
}

export async function excluirNotaFiscal(id: string) {
	const [registro] = await db
		.delete(notafiscal)
		.where(eq(notafiscal.id, id))
		.returning();

	return registro;
}
