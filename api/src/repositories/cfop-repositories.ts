import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoCFOP } from "@/model/cfop-model";
import { cfop } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarCfopPorId(id: string) {
	const [registro] = await db.select().from(cfop).where(eq(cfop.id, id));

	return registro;
}

export async function criarCfop(dadosCfop: NovoCFOP) {
	const [registro] = await db.insert(cfop).values(dadosCfop).returning();

	return registro;
}

export async function atualizarCfop(id: string, dadosCfop: Partial<NovoCFOP>) {
	const [registro] = await db
		.update(cfop)
		.set(dadosCfop)
		.where(eq(cfop.id, id))
		.returning();

	return registro;
}

export async function excluirCfop(id: string) {
	const [registro] = await db.delete(cfop).where(eq(cfop.id, id)).returning();

	return registro;
}

export type ListarCfopsParametros = {
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarCfops({
	idempresa,
	descricao,
	codigo,
	page = 1,
	limit = 10,
}: ListarCfopsParametros) {
	const where = [];

	where.push(eq(cfop.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(cfop.descricao, `%${descricao}%`));
	}

	if (codigo) {
		where.push(ilike(cfop.codigo, `%${codigo}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, cfops] = await Promise.all([
		db
			.select({ value: count() })
			.from(cfop)
			.where(and(...where)),
		db
			.select()
			.from(cfop)
			.where(and(...where))
			.orderBy(desc(cfop.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		cfops,
		total: totalCount[0]?.value ?? 0,
	};
}
