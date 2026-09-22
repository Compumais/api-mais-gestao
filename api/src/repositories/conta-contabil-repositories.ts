import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	isNotNull,
	isNull,
	ne,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type ContaContabil = typeof schema.contacontabil.$inferSelect;
export type NovaContaContabil = typeof schema.contacontabil.$inferInsert;

export const ORDENAR_CONTA_CONTABIL_CAMPOS = [
	"codigoreduzido",
	"descricao",
	"codigoextenso",
	"natureza",
	"tipocontacontabil",
	"inativo",
] as const;

export type OrdenarContaContabilCampo =
	(typeof ORDENAR_CONTA_CONTABIL_CAMPOS)[number];

export type SituacaoCodigoReduzido = "com" | "sem";

export async function criarContaContabil(dados: NovaContaContabil) {
	const [contaContabil] = await db
		.insert(schema.contacontabil)
		.values(dados)
		.returning();

	return contaContabil;
}

export async function buscarContaContabilPorId(id: string) {
	const [contaContabil] = await db
		.select()
		.from(schema.contacontabil)
		.where(eq(schema.contacontabil.id, id));

	return contaContabil;
}

export type ListarContasContabeisParametros = {
	idempresa: string;
	descricao?: string | undefined;
	q?: string | undefined;
	codigoreduzido?: string | undefined;
	codigoextenso?: string | undefined;
	natureza?: string | undefined;
	tipocontacontabil?: string | undefined;
	inativo?: number | undefined;
	situacaoCodigo?: SituacaoCodigoReduzido | undefined;
	ordenarPor?: OrdenarContaContabilCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

function resolverOrdenacaoContaContabil(
	ordenarPor: OrdenarContaContabilCampo | undefined,
	ordem: "asc" | "desc" | undefined,
) {
	if (!ordenarPor) {
		return asc(schema.contacontabil.codigoreduzido);
	}

	const fn = ordem === "desc" ? desc : asc;
	switch (ordenarPor) {
		case "codigoreduzido":
			return fn(schema.contacontabil.codigoreduzido);
		case "descricao":
			return fn(schema.contacontabil.descricao);
		case "codigoextenso":
			return fn(schema.contacontabil.codigoextenso);
		case "natureza":
			return fn(schema.contacontabil.natureza);
		case "tipocontacontabil":
			return fn(schema.contacontabil.tipocontacontabil);
		case "inativo":
			return fn(schema.contacontabil.inativo);
		default:
			return asc(schema.contacontabil.codigoreduzido);
	}
}

export async function listarContasContabeis({
	idempresa,
	descricao,
	q,
	codigoreduzido,
	codigoextenso,
	natureza,
	tipocontacontabil,
	inativo,
	situacaoCodigo,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarContasContabeisParametros) {
	const where: SQL[] = [];

	where.push(eq(schema.contacontabil.idempresa, idempresa));

	adicionarFiltroTexto(where, schema.contacontabil.descricao, descricao);
	adicionarFiltroTexto(
		where,
		schema.contacontabil.codigoreduzido,
		codigoreduzido,
	);
	adicionarFiltroTexto(
		where,
		schema.contacontabil.codigoextenso,
		codigoextenso,
	);

	if (q?.trim()) {
		const termo = `%${q.trim()}%`;
		const buscaOr = or(
			ilike(schema.contacontabil.descricao, termo),
			ilike(schema.contacontabil.codigoreduzido, termo),
			ilike(schema.contacontabil.codigoextenso, termo),
		);
		if (buscaOr) where.push(buscaOr);
	}

	if (natureza?.trim()) {
		where.push(eq(schema.contacontabil.natureza, natureza.trim()));
	}

	if (tipocontacontabil?.trim()) {
		where.push(
			eq(schema.contacontabil.tipocontacontabil, tipocontacontabil.trim()),
		);
	}

	if (inativo === 0 || inativo === 1) {
		where.push(eq(schema.contacontabil.inativo, inativo));
	}

	if (situacaoCodigo === "com") {
		const comCodigo = and(
			isNotNull(schema.contacontabil.codigoreduzido),
			ne(schema.contacontabil.codigoreduzido, ""),
		);
		if (comCodigo) where.push(comCodigo);
	} else if (situacaoCodigo === "sem") {
		const semCodigo = or(
			isNull(schema.contacontabil.codigoreduzido),
			eq(schema.contacontabil.codigoreduzido, ""),
		);
		if (semCodigo) where.push(semCodigo);
	}

	const offset = (page - 1) * limit;
	const ordenacao = resolverOrdenacaoContaContabil(ordenarPor, ordem);

	const [totalCount, contasContabeis] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.contacontabil)
			.where(and(...where)),
		db
			.select()
			.from(schema.contacontabil)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		contasContabeis,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarContaContabilPorCodigoReduzido(
	idempresa: string,
	codigo: string,
	ignorarId?: string,
) {
	const where = [
		eq(schema.contacontabil.idempresa, idempresa),
		eq(schema.contacontabil.codigoreduzido, codigo),
	];

	if (ignorarId) {
		where.push(ne(schema.contacontabil.id, ignorarId));
	}

	const [conta] = await db
		.select()
		.from(schema.contacontabil)
		.where(and(...where))
		.limit(1);

	return conta;
}

export async function buscarProximoCodigoReduzidoContaContabil(
	idempresa: string,
): Promise<string> {
	const [resultado] = await db
		.select({
			proximo: sql<number>`COALESCE(
				MAX(CAST(${schema.contacontabil.codigoreduzido} AS INTEGER))
				FILTER (WHERE ${schema.contacontabil.codigoreduzido} ~ '^[0-9]+$'),
				0
			) + 1`,
		})
		.from(schema.contacontabil)
		.where(eq(schema.contacontabil.idempresa, idempresa));

	return String(resultado?.proximo ?? 1);
}

export async function atualizarContaContabil(
	id: string,
	dados: Partial<NovaContaContabil>,
) {
	const [contaContabil] = await db
		.update(schema.contacontabil)
		.set(dados)
		.where(eq(schema.contacontabil.id, id))
		.returning();

	return contaContabil;
}

export async function excluirContaContabil(id: string) {
	const [contaContabil] = await db
		.delete(schema.contacontabil)
		.where(eq(schema.contacontabil.id, id))
		.returning();

	return contaContabil;
}

export async function buscarContasFilhas(idcontapai: string) {
	const contasFilhas = await db
		.select()
		.from(schema.contacontabil)
		.where(eq(schema.contacontabil.idcontapai, idcontapai));

	return contasFilhas;
}
