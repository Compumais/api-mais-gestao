import { and, count, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { produtos, saldoestoque } from "@/repositories/schema.js";
import { db } from "./connection";
import { ordenacaoCodigoNumericoAsc } from "./ordenacao-codigo.js";

export type ListarEstoqueGestaoPorProdutosParametros = {
	idempresa: string;
	busca?: string | undefined;
	somenteDivergencia?: boolean | undefined;
	page?: number;
	limit?: number;
};

export type EstoqueGestaoPorProduto = {
	idsaldo: number | null;
	idproduto: string;
	idempresa: string;
	codigoproduto: string | null;
	nomeproduto: string | null;
	quantidade: string | null;
	quantidadefiscal: string | null;
	ncm: string | null;
	unidademedida: string | null;
};

function filtroProdutoMercadoria() {
	return or(isNull(produtos.tipo), eq(produtos.tipo, "P"));
}

function filtroBuscaProduto(busca: string) {
	const termo = `%${busca}%`;
	return or(
		ilike(produtos.nome, termo),
		ilike(sql`${produtos.codigo}::text`, termo),
		ilike(sql`${produtos.ean}::text`, termo),
	);
}

function filtroDivergencia() {
	return sql`(
		COALESCE(${saldoestoque.quantidade}::numeric, 0)
		- COALESCE(${saldoestoque.quantidadefiscal}::numeric, 0)
	) <> 0`;
}

function joinSaldoPorProduto() {
	return and(
		eq(saldoestoque.idempresa, produtos.idempresa),
		eq(saldoestoque.codigoproduto, sql`${produtos.codigo}::text`),
	);
}

export async function listarEstoqueGestaoPorProdutos({
	idempresa,
	busca,
	somenteDivergencia = false,
	page = 1,
	limit = 20,
}: ListarEstoqueGestaoPorProdutosParametros) {
	const where = [eq(produtos.idempresa, idempresa), filtroProdutoMercadoria()];

	if (busca) {
		where.push(filtroBuscaProduto(busca));
	}

	if (somenteDivergencia) {
		where.push(filtroDivergencia());
	}

	const offset = (page - 1) * limit;

	const [totalCount, itens] = await Promise.all([
		db
			.select({ value: count() })
			.from(produtos)
			.leftJoin(saldoestoque, joinSaldoPorProduto())
			.where(and(...where)),
		db
			.select({
				idsaldo: saldoestoque.id,
				idproduto: produtos.id,
				idempresa: produtos.idempresa,
				codigoproduto: sql<string | null>`${produtos.codigo}::text`,
				nomeproduto: produtos.nome,
				quantidade: saldoestoque.quantidade,
				quantidadefiscal: saldoestoque.quantidadefiscal,
				ncm: sql<string | null>`COALESCE(${saldoestoque.ncm}, ${produtos.ncm})`,
				unidademedida: sql<string | null>`COALESCE(${saldoestoque.unidademedida}, ${produtos.unidademedida})`,
			})
			.from(produtos)
			.leftJoin(saldoestoque, joinSaldoPorProduto())
			.where(and(...where))
			.orderBy(ordenacaoCodigoNumericoAsc(produtos.codigo))
			.limit(limit)
			.offset(offset),
	]);

	return {
		itens,
		total: totalCount[0]?.value ?? 0,
	};
}
