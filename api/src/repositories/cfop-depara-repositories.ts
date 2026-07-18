import { and, count, desc, eq, isNull, ne, or } from "drizzle-orm";
import { cfopdepara } from "@/repositories/schema.js";
import { db } from "./connection";

export type CfopDePara = typeof cfopdepara.$inferSelect;
export type NovoCfopDePara = typeof cfopdepara.$inferInsert;

export async function buscarCfopSaidaPorEntrada(
	idempresa: string,
	idcfopentrada: string,
	uf?: string | undefined,
) {
	if (uf) {
		const [comUf] = await db
			.select()
			.from(cfopdepara)
			.where(
				and(
					eq(cfopdepara.idempresa, idempresa),
					eq(cfopdepara.idcfopentrada, idcfopentrada),
					eq(cfopdepara.inativo, 0),
					eq(cfopdepara.uf, uf.toUpperCase()),
				),
			)
			.limit(1);

		if (comUf) return comUf;
	}

	const [semUf] = await db
		.select()
		.from(cfopdepara)
		.where(
			and(
				eq(cfopdepara.idempresa, idempresa),
				eq(cfopdepara.idcfopentrada, idcfopentrada),
				eq(cfopdepara.inativo, 0),
				or(isNull(cfopdepara.uf), eq(cfopdepara.uf, "")),
			),
		)
		.limit(1);

	return semUf;
}

/** Resolve CFOP de entrada a partir do código de saída (XML do emitente). */
export async function buscarCfopEntradaPorCodigoSaida(
	idempresa: string,
	codigoSaida: string,
	uf?: string | undefined,
) {
	const codigo = codigoSaida.replace(/\D/g, "");
	if (!codigo) return undefined;

	if (uf) {
		const [comUf] = await db
			.select()
			.from(cfopdepara)
			.where(
				and(
					eq(cfopdepara.idempresa, idempresa),
					eq(cfopdepara.codigosaida, codigo),
					eq(cfopdepara.inativo, 0),
					eq(cfopdepara.uf, uf.toUpperCase()),
				),
			)
			.limit(1);

		if (comUf) return comUf;
	}

	const [semUf] = await db
		.select()
		.from(cfopdepara)
		.where(
			and(
				eq(cfopdepara.idempresa, idempresa),
				eq(cfopdepara.codigosaida, codigo),
				eq(cfopdepara.inativo, 0),
				or(isNull(cfopdepara.uf), eq(cfopdepara.uf, "")),
			),
		)
		.limit(1);

	return semUf;
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

export async function buscarCfopDeParaDuplicado(
	idempresa: string,
	idcfopentrada: string,
	uf?: string | null,
	excluirId?: string | undefined,
) {
	const ufNormalizada = uf?.trim().toUpperCase() || null;

	const where = [
		eq(cfopdepara.idempresa, idempresa),
		eq(cfopdepara.idcfopentrada, idcfopentrada),
		eq(cfopdepara.inativo, 0),
		ufNormalizada
			? eq(cfopdepara.uf, ufNormalizada)
			: or(isNull(cfopdepara.uf), eq(cfopdepara.uf, "")),
	];

	if (excluirId) {
		where.push(ne(cfopdepara.id, excluirId));
	}

	const [registro] = await db
		.select()
		.from(cfopdepara)
		.where(and(...where))
		.limit(1);

	return registro;
}

export async function criarCfopDePara(dados: NovoCfopDePara) {
	const [registro] = await db.insert(cfopdepara).values(dados).returning();

	return registro;
}

export async function atualizarCfopDePara(
	id: string,
	dados: Partial<
		Pick<
			NovoCfopDePara,
			| "idcfopentrada"
			| "idcfopsaida"
			| "codigoentrada"
			| "codigosaida"
			| "uf"
			| "inativo"
		>
	>,
) {
	const [registro] = await db
		.update(cfopdepara)
		.set(dados)
		.where(eq(cfopdepara.id, id))
		.returning();

	return registro;
}

export async function excluirCfopDePara(id: string) {
	const [registro] = await db
		.delete(cfopdepara)
		.where(eq(cfopdepara.id, id))
		.returning();

	return registro;
}
