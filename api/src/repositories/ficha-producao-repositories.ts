import { and, asc, count, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import type { NovaFichaProducao } from "@/model/ficha-producao-model.js";
import type { NovoFichaProducaoItem } from "@/model/ficha-producao-item-model.js";
import {
	fichaproducao,
	fichaproducaoitem,
	produtos,
} from "@/repositories/schema.js";
import { db } from "./connection.js";

export const ORDENAR_FICHAS_PRODUCAO_CAMPOS = [
	"codigo",
	"nome",
	"ativo",
	"permiteproducaomassa",
	"producaonavenda",
	"atualizadoem",
] as const;

export type OrdenarFichasProducaoCampo =
	(typeof ORDENAR_FICHAS_PRODUCAO_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	codigo: produtos.codigo,
	nome: produtos.nome,
	ativo: fichaproducao.ativo,
	permiteproducaomassa: fichaproducao.permiteproducaomassa,
	producaonavenda: fichaproducao.producaonavenda,
	atualizadoem: fichaproducao.atualizadoem,
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

export async function criarFichaProducao(dados: NovaFichaProducao) {
	const [registro] = await db
		.insert(fichaproducao)
		.values(dados)
		.returning();
	return registro;
}

export async function criarFichaProducaoItens(
	itens: NovoFichaProducaoItem[],
) {
	if (itens.length === 0) return [];
	return db.insert(fichaproducaoitem).values(itens).returning();
}

export async function criarFichaProducaoComItens(
	dados: NovaFichaProducao,
	itens: NovoFichaProducaoItem[],
) {
	return db.transaction(async (tx) => {
		const [ficha] = await tx
			.insert(fichaproducao)
			.values(dados)
			.returning();
		if (!ficha) return null;

		const itensCriados =
			itens.length > 0
				? await tx.insert(fichaproducaoitem).values(itens).returning()
				: [];

		return { ficha, itens: itensCriados };
	});
}

export async function buscarFichaProducaoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(fichaproducao)
		.where(eq(fichaproducao.id, id));
	return registro;
}

export async function buscarFichaProducaoAtivaPorProduto(
	idempresa: string,
	idprodutoacabado: string,
) {
	const [registro] = await db
		.select()
		.from(fichaproducao)
		.where(
			and(
				eq(fichaproducao.idempresa, idempresa),
				eq(fichaproducao.idprodutoacabado, idprodutoacabado),
				eq(fichaproducao.ativo, 1),
			),
		)
		.limit(1);
	return registro;
}

export async function listarItensFichaProducao(idfichaproducao: string) {
	return db
		.select()
		.from(fichaproducaoitem)
		.where(eq(fichaproducaoitem.idfichaproducao, idfichaproducao))
		.orderBy(asc(fichaproducaoitem.ordem), asc(fichaproducaoitem.id));
}

export async function listarItensFichaProducaoEnriquecidos(
	idfichaproducao: string,
) {
	return db
		.select({
			id: fichaproducaoitem.id,
			idfichaproducao: fichaproducaoitem.idfichaproducao,
			idproduto: fichaproducaoitem.idproduto,
			quantidade: fichaproducaoitem.quantidade,
			ordem: fichaproducaoitem.ordem,
			nomeproduto: produtos.nome,
			codigoproduto: produtos.codigo,
			unidademedida: produtos.unidademedida,
			custoaquisicao: produtos.custoaquisicao,
			customedioinicial: produtos.customedioinicial,
			precoultimacompra: produtos.precoultimacompra,
		})
		.from(fichaproducaoitem)
		.leftJoin(produtos, eq(fichaproducaoitem.idproduto, produtos.id))
		.where(eq(fichaproducaoitem.idfichaproducao, idfichaproducao))
		.orderBy(asc(fichaproducaoitem.ordem), asc(fichaproducaoitem.id));
}

export async function atualizarFichaProducao(
	id: string,
	dados: Partial<NovaFichaProducao>,
) {
	const [registro] = await db
		.update(fichaproducao)
		.set(dados)
		.where(eq(fichaproducao.id, id))
		.returning();
	return registro;
}

export async function substituirItensFichaProducao(
	idfichaproducao: string,
	itens: NovoFichaProducaoItem[],
) {
	return db.transaction(async (tx) => {
		await tx
			.delete(fichaproducaoitem)
			.where(eq(fichaproducaoitem.idfichaproducao, idfichaproducao));

		if (itens.length === 0) return [];

		return tx.insert(fichaproducaoitem).values(itens).returning();
	});
}

export async function excluirFichaProducao(id: string) {
	const [registro] = await db
		.delete(fichaproducao)
		.where(eq(fichaproducao.id, id))
		.returning();
	return registro;
}

export type ListarFichasProducaoParametros = {
	idempresa: string;
	q?: string | undefined;
	codigo?: string | undefined;
	nome?: string | undefined;
	ativo?: number | undefined;
	permiteproducaomassa?: number | undefined;
	producaonavenda?: number | undefined;
	ordenarPor?: OrdenarFichasProducaoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarFichasProducao({
	idempresa,
	q,
	codigo,
	nome,
	ativo,
	permiteproducaomassa,
	producaonavenda,
	ordenarPor,
	ordem = "desc",
	page = 1,
	limit = 10,
}: ListarFichasProducaoParametros) {
	const where: SQL[] = [eq(fichaproducao.idempresa, idempresa)];

	if (ativo !== undefined) {
		where.push(eq(fichaproducao.ativo, ativo));
	}

	if (permiteproducaomassa !== undefined) {
		where.push(eq(fichaproducao.permiteproducaomassa, permiteproducaomassa));
	}

	if (producaonavenda !== undefined) {
		where.push(eq(fichaproducao.producaonavenda, producaonavenda));
	}

	if (q) {
		where.push(
			or(
				ilike(produtos.nome, `%${q}%`),
				ilike(sql`CAST(${produtos.codigo} AS TEXT)`, `%${q}%`),
			)!,
		);
	}

	adicionarFiltroTexto(
		where,
		sql`CAST(${produtos.codigo} AS TEXT)`,
		codigo,
	);
	adicionarFiltroTexto(where, produtos.nome, nome);

	const filtro = and(...where);
	const offset = (page - 1) * limit;

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "asc"
				? asc(COLUNAS_ORDENACAO[ordenarPor])
				: desc(COLUNAS_ORDENACAO[ordenarPor])
			: desc(fichaproducao.atualizadoem);

	const [totalCount, fichas] = await Promise.all([
		db
			.select({ value: count() })
			.from(fichaproducao)
			.leftJoin(produtos, eq(fichaproducao.idprodutoacabado, produtos.id))
			.where(filtro),
		db
			.select({
				id: fichaproducao.id,
				idempresa: fichaproducao.idempresa,
				idprodutoacabado: fichaproducao.idprodutoacabado,
				ativo: fichaproducao.ativo,
				permiteproducaomassa: fichaproducao.permiteproducaomassa,
				producaonavenda: fichaproducao.producaonavenda,
				observacao: fichaproducao.observacao,
				criadoem: fichaproducao.criadoem,
				atualizadoem: fichaproducao.atualizadoem,
				nomeprodutoacabado: produtos.nome,
				codigoprodutoacabado: produtos.codigo,
				unidademedidaacabado: produtos.unidademedida,
			})
			.from(fichaproducao)
			.leftJoin(produtos, eq(fichaproducao.idprodutoacabado, produtos.id))
			.where(filtro)
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		fichas,
		total: totalCount[0]?.value ?? 0,
	};
}
