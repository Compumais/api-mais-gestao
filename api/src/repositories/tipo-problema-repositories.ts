import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoTipoProblema } from "@/model/tipo-problema-model";
import { tipoproblema } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarTipoProblemaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(tipoproblema)
		.where(eq(tipoproblema.id, id));

	return registro;
}

export async function criarTipoProblema(dadosTipoProblema: NovoTipoProblema) {
	const [registro] = await db
		.insert(tipoproblema)
		.values(dadosTipoProblema)
		.returning();

	return registro;
}

export async function atualizarTipoProblema(
	id: string,
	dadosTipoProblema: Partial<NovoTipoProblema>,
) {
	const [registro] = await db
		.update(tipoproblema)
		.set(dadosTipoProblema)
		.where(eq(tipoproblema.id, id))
		.returning();

	return registro;
}

export async function excluirTipoProblema(id: string) {
	const [registro] = await db
		.delete(tipoproblema)
		.where(eq(tipoproblema.id, id))
		.returning();

	return registro;
}

export type ListarTiposProblemaParametros = {
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarTiposProblema({
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarTiposProblemaParametros) {
	const where = [];

	where.push(eq(tipoproblema.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(tipoproblema.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(tipoproblema.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, tiposproblema] = await Promise.all([
		db
			.select({ value: count() })
			.from(tipoproblema)
			.where(and(...where)),
		db
			.select()
			.from(tipoproblema)
			.where(and(...where))
			.orderBy(desc(tipoproblema.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		tiposproblema,
		total: totalCount[0]?.value ?? 0,
	};
}
