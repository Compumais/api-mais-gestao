import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	isNull,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { NovoUnidadeMedida } from "@/model/unidade-medida-model";
import { unidademedida } from "@/repositories/schema.js";
import { db } from "./connection";
import { ordenacaoCodigoVarcharAsc } from "./ordenacao-codigo.js";

export const ORDENAR_UNIDADE_MEDIDA_CAMPOS = [
	"codigo",
	"nome",
	"origem",
	"casasdecimais",
	"tipovalor",
] as const;

export type OrdenarUnidadeMedidaCampo =
	(typeof ORDENAR_UNIDADE_MEDIDA_CAMPOS)[number];

export type OrigemUnidadeMedidaFiltro = "sistema" | "empresa";

const ordenacaoOrigem = sql<number>`CASE WHEN ${unidademedida.idempresa} IS NULL THEN 0 ELSE 1 END`;

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

function resolverOrdenacao(
	ordenarPor: OrdenarUnidadeMedidaCampo | undefined,
	ordem: "asc" | "desc",
) {
	if (!ordenarPor) return undefined;

	const fn = ordem === "desc" ? desc : asc;

	switch (ordenarPor) {
		case "codigo":
			return fn(unidademedida.codigo);
		case "nome":
			return fn(unidademedida.nome);
		case "origem":
			return fn(ordenacaoOrigem);
		case "casasdecimais":
			return fn(unidademedida.casasdecimais);
		case "tipovalor":
			return fn(unidademedida.tipovalor);
		default:
			return undefined;
	}
}

export async function buscarUnidadeMedidaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(unidademedida)
		.where(eq(unidademedida.id, id));

	return registro;
}

export async function buscarUnidadeMedidaPorSigla(
	idempresa: string,
	sigla: string,
) {
	const siglaNormalizada = sigla.trim().toUpperCase();

	const [registro] = await db
		.select()
		.from(unidademedida)
		.where(
			and(
				or(
					eq(unidademedida.idempresa, idempresa),
					isNull(unidademedida.idempresa),
				),
				or(
					eq(unidademedida.codigo, siglaNormalizada),
					ilike(unidademedida.codigo, siglaNormalizada),
				),
			),
		)
		.limit(1);

	return registro;
}

export async function criarUnidadeMedida(
	dadosUnidadeMedida: NovoUnidadeMedida,
) {
	const [registro] = await db
		.insert(unidademedida)
		.values(dadosUnidadeMedida)
		.returning();

	return registro;
}

export async function atualizarUnidadeMedida(
	id: string,
	dadosUnidadeMedida: Partial<NovoUnidadeMedida>,
) {
	const [registro] = await db
		.update(unidademedida)
		.set(dadosUnidadeMedida)
		.where(eq(unidademedida.id, id))
		.returning();

	return registro;
}

export async function excluirUnidadeMedida(id: string) {
	const [registro] = await db
		.delete(unidademedida)
		.where(eq(unidademedida.id, id))
		.returning();

	return registro;
}

export type ListarUnidadesMedidaParametros = {
	idempresa: string;
	nome?: string | undefined;
	q?: string | undefined;
	codigo?: string | undefined;
	origem?: OrigemUnidadeMedidaFiltro | undefined;
	casasdecimais?: string | undefined;
	tipovalor?: string | undefined;
	ordenarPor?: OrdenarUnidadeMedidaCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarUnidadesMedida({
	idempresa,
	nome,
	q,
	codigo,
	origem,
	casasdecimais,
	tipovalor,
	ordenarPor,
	ordem = "asc",
	page = 1,
	limit = 10,
}: ListarUnidadesMedidaParametros) {
	const where: SQL[] = [];

	const filtroEmpresa = or(
		eq(unidademedida.idempresa, idempresa),
		isNull(unidademedida.idempresa),
	);
	if (filtroEmpresa) where.push(filtroEmpresa);

	if (nome) {
		where.push(ilike(unidademedida.nome, `%${nome}%`));
	}

	if (q) {
		const termo = `%${q}%`;
		const buscaOr = or(
			ilike(unidademedida.codigo, termo),
			ilike(unidademedida.nome, termo),
		);
		if (buscaOr) where.push(buscaOr);
	}

	adicionarFiltroTexto(where, unidademedida.codigo, codigo);
	adicionarFiltroTexto(
		where,
		sql`${unidademedida.casasdecimais}::text`,
		casasdecimais,
	);
	adicionarFiltroTexto(where, sql`${unidademedida.tipovalor}::text`, tipovalor);

	if (origem === "sistema") {
		where.push(isNull(unidademedida.idempresa));
	} else if (origem === "empresa") {
		where.push(eq(unidademedida.idempresa, idempresa));
	}

	const offset = (page - 1) * limit;
	const filtro = and(...where);
	const ordenacao = resolverOrdenacao(ordenarPor, ordem);

	const [totalCount, unidadesmedida] = await Promise.all([
		db.select({ value: count() }).from(unidademedida).where(filtro),
		ordenacao
			? db
					.select()
					.from(unidademedida)
					.where(filtro)
					.orderBy(ordenacao)
					.limit(limit)
					.offset(offset)
			: db
					.select()
					.from(unidademedida)
					.where(filtro)
					.orderBy(...ordenacaoCodigoVarcharAsc(unidademedida.codigo))
					.limit(limit)
					.offset(offset),
	]);

	return {
		unidadesmedida,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function listarUnidadesMedidaPorEmpresa(idempresa: string) {
	return db
		.select({
			id: unidademedida.id,
			codigo: unidademedida.codigo,
			idempresa: unidademedida.idempresa,
		})
		.from(unidademedida)
		.where(
			or(
				eq(unidademedida.idempresa, idempresa),
				isNull(unidademedida.idempresa),
			),
		);
}
