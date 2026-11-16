import { and, count, desc, eq, type SQL } from "drizzle-orm";
import type {
	NovaRemessaBancaria,
	NovaRemessaBancariaItem,
} from "@/model/contrato-model.js";
import {
	remessabancaria,
	remessabancariaitem,
} from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function criarRemessaBancaria(dados: NovaRemessaBancaria) {
	const [registro] = await db.insert(remessabancaria).values(dados).returning();
	return registro;
}

export async function buscarRemessaBancariaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(remessabancaria)
		.where(eq(remessabancaria.id, id));
	return registro;
}

export async function buscarRemessaBancariaPorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(remessabancaria)
		.where(
			and(eq(remessabancaria.id, id), eq(remessabancaria.idempresa, idempresa)),
		);
	return registro;
}

export async function atualizarRemessaBancaria(
	id: string,
	dados: Partial<NovaRemessaBancaria>,
) {
	const [registro] = await db
		.update(remessabancaria)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(remessabancaria.id, id))
		.returning();
	return registro;
}

export async function buscarRemessaAbertaPorConta(
	idempresa: string,
	idcontacorrente: string,
) {
	const [registro] = await db
		.select()
		.from(remessabancaria)
		.where(
			and(
				eq(remessabancaria.idempresa, idempresa),
				eq(remessabancaria.idcontacorrente, idcontacorrente),
				eq(remessabancaria.status, "aberta"),
			),
		)
		.orderBy(desc(remessabancaria.criadoem))
		.limit(1);
	return registro;
}

export async function criarRemessaBancariaItem(dados: NovaRemessaBancariaItem) {
	const [registro] = await db
		.insert(remessabancariaitem)
		.values(dados)
		.onConflictDoNothing({
			target: [remessabancariaitem.idfinanceiro],
		})
		.returning();
	return registro;
}

export async function buscarRemessaItemPorFinanceiro(idfinanceiro: string) {
	const [registro] = await db
		.select()
		.from(remessabancariaitem)
		.where(eq(remessabancariaitem.idfinanceiro, idfinanceiro));
	return registro;
}

export async function listarItensRemessa(idremessa: string) {
	return db
		.select()
		.from(remessabancariaitem)
		.where(eq(remessabancariaitem.idremessa, idremessa))
		.orderBy(desc(remessabancariaitem.criadoem));
}

export type ListarRemessasParametros = {
	idempresa: string;
	idcontacorrente?: string | undefined;
	status?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarRemessasBancarias({
	idempresa,
	idcontacorrente,
	status,
	page = 1,
	limit = 20,
}: ListarRemessasParametros) {
	const where: SQL[] = [eq(remessabancaria.idempresa, idempresa)];
	if (idcontacorrente) {
		where.push(eq(remessabancaria.idcontacorrente, idcontacorrente));
	}
	if (status?.trim()) {
		where.push(eq(remessabancaria.status, status.trim()));
	}

	const offset = (page - 1) * limit;
	const [totalCount, remessas] = await Promise.all([
		db
			.select({ value: count() })
			.from(remessabancaria)
			.where(and(...where)),
		db
			.select()
			.from(remessabancaria)
			.where(and(...where))
			.orderBy(desc(remessabancaria.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		remessas,
		total: totalCount[0]?.value ?? 0,
	};
}
