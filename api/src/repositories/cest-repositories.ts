import { and, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { NovoCEST } from "@/model/cest-mode";
import { cest } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarCestPorId(id: string) {
	const [registro] = await db.select().from(cest).where(eq(cest.id, id));

	return registro;
}

export async function buscarCestPorCodigo(
	idempresa: string,
	codigo: string,
) {
	const codigoNormalizado = codigo.replace(/\D/g, "");

	const [registroEmpresa] = await db
		.select()
		.from(cest)
		.where(
			and(
				eq(cest.idempresa, idempresa),
				eq(cest.codigo, codigoNormalizado),
				or(eq(cest.inativo, 0), isNull(cest.inativo)),
			),
		)
		.limit(1);

	if (registroEmpresa) return registroEmpresa;

	const [registroGlobal] = await db
		.select()
		.from(cest)
		.where(
			and(
				isNull(cest.idempresa),
				eq(cest.codigo, codigoNormalizado),
				or(eq(cest.inativo, 0), isNull(cest.inativo)),
			),
		)
		.limit(1);

	return registroGlobal;
}

export async function criarCest(dadosCest: NovoCEST) {
	const [registro] = await db.insert(cest).values(dadosCest).returning();

	return registro;
}

const TAMANHO_LOTE_CEST = 200;

export async function criarCestsEmLote(dadosCests: NovoCEST[]) {
	if (dadosCests.length === 0) {
		return [];
	}

	const registrosCriados = [];

	for (let indice = 0; indice < dadosCests.length; indice += TAMANHO_LOTE_CEST) {
		const lote = dadosCests.slice(indice, indice + TAMANHO_LOTE_CEST);
		const registros = await db
			.insert(cest)
			.values(lote)
			.onConflictDoNothing({ target: cest.id })
			.returning();
		registrosCriados.push(...registros);
	}

	return registrosCriados;
}

export async function contarCestsGlobais(): Promise<number> {
	const [resultado] = await db
		.select({ value: count() })
		.from(cest)
		.where(isNull(cest.idempresa));

	return resultado?.value ?? 0;
}

export async function atualizarCest(id: string, dadosCest: Partial<NovoCEST>) {
	const [registro] = await db
		.update(cest)
		.set(dadosCest)
		.where(eq(cest.id, id))
		.returning();

	return registro;
}

export async function excluirCest(id: string) {
	const [registro] = await db.delete(cest).where(eq(cest.id, id)).returning();

	return registro;
}

export type ListarCestsParametros = {
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarCests({
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarCestsParametros) {
	const where = [
		or(eq(cest.idempresa, idempresa), isNull(cest.idempresa)),
	];

	if (descricao) {
		where.push(ilike(cest.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		where.push(
			inativo === 0
				? or(eq(cest.inativo, 0), isNull(cest.inativo))
				: eq(cest.inativo, inativo),
		);
	}

	const offset = (page - 1) * limit;
	const filtro = and(...where);

	const [totalCount, cests] = await Promise.all([
		db.select({ value: count() }).from(cest).where(filtro),
		db
			.select()
			.from(cest)
			.where(filtro)
			.orderBy(desc(cest.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		cests,
		total: totalCount[0]?.value ?? 0,
	};
}
