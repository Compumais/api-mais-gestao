import { and, count, desc, eq } from "drizzle-orm";
import { cfopdepara } from "@/repositories/schema.js";
import { db } from "./connection";

export type CfopDePara = typeof cfopdepara.$inferSelect;
export type NovoCfopDePara = typeof cfopdepara.$inferInsert;

export async function buscarCfopSaidaPorEntrada(
	idempresa: string,
	idcfopentrada: string,
	uf?: string | undefined,
) {
	const where = [
		eq(cfopdepara.idempresa, idempresa),
		eq(cfopdepara.idcfopentrada, idcfopentrada),
		eq(cfopdepara.inativo, 0),
	];

	if (uf) {
		where.push(eq(cfopdepara.uf, uf));
	}

	const [registro] = await db
		.select()
		.from(cfopdepara)
		.where(and(...where))
		.limit(1);

	return registro;
}

export type ListarCfopDeParaParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
};

export async function listarCfopDePara({
	idempresa,
	page = 1,
	limit = 10,
}: ListarCfopDeParaParametros) {
	const where = and(
		eq(cfopdepara.idempresa, idempresa),
		eq(cfopdepara.inativo, 0),
	);

	const offset = (page - 1) * limit;

	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(cfopdepara).where(where),
		db
			.select()
			.from(cfopdepara)
			.where(where)
			.orderBy(desc(cfopdepara.codigoentrada))
			.limit(limit)
			.offset(offset),
	]);

	return {
		registros,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarCfopDeParaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(cfopdepara)
		.where(eq(cfopdepara.id, id));

	return registro;
}

export async function criarCfopDePara(dados: NovoCfopDePara) {
	const [registro] = await db.insert(cfopdepara).values(dados).returning();

	return registro;
}

export async function excluirCfopDePara(id: string) {
	const [registro] = await db
		.delete(cfopdepara)
		.where(eq(cfopdepara.id, id))
		.returning();

	return registro;
}
