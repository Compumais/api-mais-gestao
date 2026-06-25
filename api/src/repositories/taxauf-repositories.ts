import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import { taxauf } from "@/repositories/schema.js";
import { db } from "./connection";

export type TaxaUf = typeof taxauf.$inferSelect;
export type NovaTaxaUf = typeof taxauf.$inferInsert;

export async function buscarTaxaUfPorId(id: string) {
	const [registro] = await db
		.select()
		.from(taxauf)
		.where(eq(taxauf.id, id));

	return registro;
}

export async function buscarTaxaUfPorCodigo(idempresa: string, codigo: string) {
	const codigoNormalizado = codigo.trim().toUpperCase();

	const [registro] = await db
		.select()
		.from(taxauf)
		.where(
			and(
				eq(taxauf.idempresa, idempresa),
				eq(taxauf.codigo, codigoNormalizado),
				eq(taxauf.inativo, 0),
			),
		)
		.limit(1);

	return registro;
}

export async function verificarEmpresaPossuiTaxas(idempresa: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(taxauf)
		.where(eq(taxauf.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarTaxaUf(dados: NovaTaxaUf) {
	const [registro] = await db.insert(taxauf).values(dados).returning();

	return registro;
}

export async function criarTaxasUfEmLote(dados: NovaTaxaUf[]) {
	if (dados.length === 0) return [];

	return db.insert(taxauf).values(dados).returning();
}

export async function atualizarTaxaUf(id: string, dados: Partial<NovaTaxaUf>) {
	const [registro] = await db
		.update(taxauf)
		.set(dados)
		.where(eq(taxauf.id, id))
		.returning();

	return registro;
}

export async function excluirTaxaUf(id: string) {
	const [registro] = await db.delete(taxauf).where(eq(taxauf.id, id)).returning();

	return registro;
}

export type ListarTaxaUfParametros = {
	idempresa: string;
	busca?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarTaxaUf({
	idempresa,
	busca,
	inativo,
	page = 1,
	limit = 10,
}: ListarTaxaUfParametros) {
	const where = [eq(taxauf.idempresa, idempresa)];

	if (busca) {
		const termo = `%${busca}%`;
		where.push(
			or(
				ilike(taxauf.descricao, termo),
				ilike(taxauf.codigo, termo),
			) as (typeof where)[number],
		);
	}

	if (inativo !== undefined) {
		where.push(eq(taxauf.inativo, inativo));
	}

	const offset = (page - 1) * limit;
	const filtro = and(...where);

	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(taxauf).where(filtro),
		db
			.select()
			.from(taxauf)
			.where(filtro)
			.orderBy(desc(taxauf.codigo))
			.limit(limit)
			.offset(offset),
	]);

	return {
		registros,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarTaxaUfDuplicada(
	idempresa: string,
	codigo: string,
	excluirId?: string | undefined,
) {
	const codigoNormalizado = codigo.trim().toUpperCase();
	const where = [
		eq(taxauf.idempresa, idempresa),
		eq(taxauf.codigo, codigoNormalizado),
	];

	if (excluirId) {
		where.push(ne(taxauf.id, excluirId));
	}

	const [registro] = await db
		.select()
		.from(taxauf)
		.where(and(...where))
		.limit(1);

	return registro;
}
