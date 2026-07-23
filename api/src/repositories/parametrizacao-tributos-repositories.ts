import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNull,
	ne,
	or,
	sql,
} from "drizzle-orm";
import { parametrizacaotributos } from "@/repositories/schema.js";
import {
	normalizarCodigoCfop,
	regraParametrizacaoCasaComNota,
	scoreEspecificidadeRegra,
} from "@/util/parametrizacao-tributos-matching.js";
import { db } from "./connection";

export type ParametrizacaoTributos = typeof parametrizacaotributos.$inferSelect;
export type NovaParametrizacaoTributos =
	typeof parametrizacaotributos.$inferInsert;

export type BuscarParametrizacaoTributosParametros = {
	idempresa: string;
	codigocfopentrada?: string | undefined;
	cstentrada?: string | undefined;
	csosnentrada?: string | undefined;
	ncm?: string | undefined;
	uf?: string | undefined;
	ignorarprimeirodigitocst?: boolean | undefined;
};

export async function buscarParametrizacaoTributosImportacao({
	idempresa,
	codigocfopentrada,
	cstentrada,
	csosnentrada,
	ncm,
	uf,
}: BuscarParametrizacaoTributosParametros) {
	const cfopNormalizado = normalizarCodigoCfop(codigocfopentrada);
	if (!cfopNormalizado) return undefined;

	const ufNormalizada = uf?.trim().toUpperCase() || undefined;

	const registros = await db
		.select()
		.from(parametrizacaotributos)
		.where(
			and(
				eq(parametrizacaotributos.idempresa, idempresa),
				eq(parametrizacaotributos.inativo, 0),
			),
		);

	const candidatos = registros.filter((registro) => {
		if (normalizarCodigoCfop(registro.codigocfopentrada) !== cfopNormalizado) {
			return false;
		}

		return regraParametrizacaoCasaComNota(registro, {
			cstentrada,
			csosnentrada,
			ncm,
			uf: ufNormalizada,
		});
	});

	if (candidatos.length === 0) return undefined;

	candidatos.sort(
		(a, b) => scoreEspecificidadeRegra(b) - scoreEspecificidadeRegra(a),
	);

	return candidatos[0];
}

export type ListarParametrizacaoTributosParametros = {
	idempresa: string;
	busca?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarParametrizacaoTributos({
	idempresa,
	busca,
	page = 1,
	limit = 10,
}: ListarParametrizacaoTributosParametros) {
	const where = [eq(parametrizacaotributos.idempresa, idempresa)];

	if (busca) {
		where.push(
			or(
				ilike(parametrizacaotributos.codigocfopentrada, `%${busca}%`),
				ilike(parametrizacaotributos.ncm, `%${busca}%`),
				ilike(parametrizacaotributos.cstentrada, `%${busca}%`),
			) ?? sql`true`,
		);
	}

	const filtro = and(...where);
	const offset = (page - 1) * limit;

	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(parametrizacaotributos).where(filtro),
		db
			.select()
			.from(parametrizacaotributos)
			.where(filtro)
			.orderBy(desc(parametrizacaotributos.codigocfopentrada))
			.limit(limit)
			.offset(offset),
	]);

	return {
		registros,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarParametrizacaoTributosPorId(id: string) {
	const [registro] = await db
		.select()
		.from(parametrizacaotributos)
		.where(eq(parametrizacaotributos.id, id));

	return registro;
}

export async function verificarEmpresaPossuiParametrizacaoTributos(
	idempresa: string,
): Promise<boolean> {
	const [resultado] = await db
		.select({ value: count() })
		.from(parametrizacaotributos)
		.where(eq(parametrizacaotributos.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarParametrizacaoTributos(dados: NovaParametrizacaoTributos) {
	const [registro] = await db
		.insert(parametrizacaotributos)
		.values(dados)
		.returning();

	return registro;
}

const TAMANHO_LOTE_PARAMETRIZACAO = 50;

export async function criarParametrizacaoTributosEmLote(
	dados: NovaParametrizacaoTributos[],
) {
	if (dados.length === 0) {
		return [];
	}

	const registrosCriados = [];

	for (
		let indice = 0;
		indice < dados.length;
		indice += TAMANHO_LOTE_PARAMETRIZACAO
	) {
		const lote = dados.slice(indice, indice + TAMANHO_LOTE_PARAMETRIZACAO);
		const registros = await db
			.insert(parametrizacaotributos)
			.values(lote)
			.returning();
		registrosCriados.push(...registros);
	}

	return registrosCriados;
}

export async function atualizarParametrizacaoTributos(
	id: string,
	dados: Partial<NovaParametrizacaoTributos>,
) {
	const [registro] = await db
		.update(parametrizacaotributos)
		.set(dados)
		.where(eq(parametrizacaotributos.id, id))
		.returning();

	return registro;
}

export async function excluirParametrizacaoTributos(id: string) {
	const [registro] = await db
		.delete(parametrizacaotributos)
		.where(eq(parametrizacaotributos.id, id))
		.returning();

	return registro;
}

export async function buscarParametrizacaoTributosDuplicada(
	idempresa: string,
	codigocfopentrada: string,
	cstentrada?: string | null,
	csosnentrada?: string | null,
	ncm?: string | null,
	uf?: string | null,
	excluirId?: string | undefined,
) {
	const where = [
		eq(parametrizacaotributos.idempresa, idempresa),
		eq(parametrizacaotributos.codigocfopentrada, codigocfopentrada),
		cstentrada
			? eq(parametrizacaotributos.cstentrada, cstentrada)
			: or(
					isNull(parametrizacaotributos.cstentrada),
					eq(parametrizacaotributos.cstentrada, ""),
				),
		csosnentrada
			? eq(parametrizacaotributos.csosnentrada, csosnentrada)
			: or(
					isNull(parametrizacaotributos.csosnentrada),
					eq(parametrizacaotributos.csosnentrada, ""),
				),
		ncm
			? eq(parametrizacaotributos.ncm, ncm)
			: or(isNull(parametrizacaotributos.ncm), eq(parametrizacaotributos.ncm, "")),
		uf
			? eq(parametrizacaotributos.uf, uf)
			: or(isNull(parametrizacaotributos.uf), eq(parametrizacaotributos.uf, "")),
	];

	if (excluirId) {
		where.push(ne(parametrizacaotributos.id, excluirId));
	}

	const [registro] = await db
		.select()
		.from(parametrizacaotributos)
		.where(and(...where))
		.limit(1);

	return registro;
}
