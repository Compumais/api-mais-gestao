import { and, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type ServicoNfse = typeof schema.servicosnfse.$inferSelect;
export type NovoServicoNfse = typeof schema.servicosnfse.$inferInsert;

export type ListarServicosNfseParametros = {
	q?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarServicosNfse({
	q,
	page = 1,
	limit = 20,
}: ListarServicosNfseParametros) {
	const where = [
		isNull(schema.servicosnfse.idempresa),
		or(
			eq(schema.servicosnfse.inativo, 0),
			isNull(schema.servicosnfse.inativo),
		),
	];

	if (q) {
		const termo = `%${q}%`;
		where.push(
			or(
				ilike(schema.servicosnfse.codigo, termo),
				ilike(schema.servicosnfse.descricao, termo),
			),
		);
	}

	const offset = (page - 1) * limit;
	const filtro = and(...where);

	const [totalCount, servicos] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.servicosnfse)
			.where(filtro),
		db
			.select()
			.from(schema.servicosnfse)
			.where(filtro)
			.orderBy(desc(schema.servicosnfse.codigo))
			.limit(limit)
			.offset(offset),
	]);

	return {
		servicos,
		total: totalCount[0]?.value ?? 0,
	};
}
