import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { NovoHierarquia } from "@/model/hierarquia-model";
import { hierarquia } from "@/repositories/schema.js";
import { db } from "./connection";
import { ordenacaoCodigoVarcharAsc } from "./ordenacao-codigo.js";

export const ORDENAR_HIERARQUIAS_CAMPOS = [
	"codigo",
	"nome",
	"ncm",
	"classe",
	"origem",
	"comissao",
	"enviamobile",
] as const;

export type OrdenarHierarquiasCampo =
	(typeof ORDENAR_HIERARQUIAS_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	codigo: hierarquia.codigo,
	nome: hierarquia.nome,
	ncm: hierarquia.ncm,
	classe: hierarquia.classe,
	origem: hierarquia.origem,
	comissao: hierarquia.comissao,
	enviamobile: hierarquia.enviamobile,
} as const;

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

export async function buscarHierarquiaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(hierarquia)
		.where(eq(hierarquia.id, id));

	return registro;
}

export async function criarHierarquia(dadosHierarquia: NovoHierarquia) {
	const [registro] = await db
		.insert(hierarquia)
		.values(dadosHierarquia)
		.returning();

	return registro;
}

export async function atualizarHierarquia(
	id: string,
	dadosHierarquia: Partial<NovoHierarquia>,
) {
	const [registro] = await db
		.update(hierarquia)
		.set(dadosHierarquia)
		.where(eq(hierarquia.id, id))
		.returning();

	return registro;
}

export async function excluirHierarquia(id: string) {
	const [registro] = await db
		.delete(hierarquia)
		.where(eq(hierarquia.id, id))
		.returning();

	return registro;
}

export type ListarHierarquiasParametros = {
	idempresa: string;
	nome?: string | undefined;
	q?: string | undefined;
	codigo?: string | undefined;
	ncm?: string | undefined;
	classe?: number | undefined;
	origem?: number | undefined;
	comissao?: string | undefined;
	enviamobile?: number | undefined;
	ordenarPor?: OrdenarHierarquiasCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarHierarquias({
	idempresa,
	nome,
	q,
	codigo,
	ncm,
	classe,
	origem,
	comissao,
	enviamobile,
	ordenarPor,
	ordem = "asc",
	page = 1,
	limit = 10,
}: ListarHierarquiasParametros) {
	const where: SQL[] = [];

	where.push(eq(hierarquia.idempresa, idempresa));

	if (nome) {
		where.push(ilike(hierarquia.nome, `%${nome}%`));
	}

	if (q) {
		const termo = `%${q}%`;
		const buscaOr = or(
			ilike(hierarquia.codigo, termo),
			ilike(hierarquia.nome, termo),
		);
		if (buscaOr) where.push(buscaOr);
	}

	adicionarFiltroTexto(where, hierarquia.codigo, codigo);
	adicionarFiltroTexto(where, hierarquia.ncm, ncm);
	adicionarFiltroTexto(where, sql`${hierarquia.comissao}::text`, comissao);

	if (classe !== undefined) {
		where.push(eq(hierarquia.classe, classe));
	}
	if (origem !== undefined) {
		where.push(eq(hierarquia.origem, origem));
	}
	if (enviamobile !== undefined) {
		where.push(eq(hierarquia.enviamobile, enviamobile));
	}

	const offset = (page - 1) * limit;

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "desc"
				? desc(COLUNAS_ORDENACAO[ordenarPor])
				: asc(COLUNAS_ORDENACAO[ordenarPor])
			: undefined;

	const [totalCount, hierarquias] = await Promise.all([
		db
			.select({ value: count() })
			.from(hierarquia)
			.where(and(...where)),
		ordenacao
			? db
					.select()
					.from(hierarquia)
					.where(and(...where))
					.orderBy(ordenacao)
					.limit(limit)
					.offset(offset)
			: db
					.select()
					.from(hierarquia)
					.where(and(...where))
					.orderBy(...ordenacaoCodigoVarcharAsc(hierarquia.codigo))
					.limit(limit)
					.offset(offset),
	]);

	return {
		hierarquias,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function listarHierarquiasPorEmpresa(idempresa: string) {
	return db
		.select()
		.from(hierarquia)
		.where(eq(hierarquia.idempresa, idempresa))
		.orderBy(...ordenacaoCodigoVarcharAsc(hierarquia.codigo));
}
