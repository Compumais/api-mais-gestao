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
import { produtos, saldoestoque } from "@/repositories/schema.js";
import { db } from "./connection";
import { ordenacaoCodigoNumericoAsc } from "./ordenacao-codigo.js";

export const ORDENAR_ESTOQUE_SALDOS_CAMPOS = [
	"codigo",
	"nome",
	"quantidade",
	"quantidadefiscal",
	"divergencia",
	"ncm",
	"unidademedida",
] as const;

export type OrdenarEstoqueSaldosCampo =
	(typeof ORDENAR_ESTOQUE_SALDOS_CAMPOS)[number];

export type ListarEstoqueGestaoPorProdutosParametros = {
	idempresa: string;
	busca?: string | undefined;
	codigoproduto?: string | undefined;
	nomeproduto?: string | undefined;
	ncm?: string | undefined;
	unidademedida?: string | undefined;
	somenteDivergencia?: boolean | undefined;
	ordenarPor?: OrdenarEstoqueSaldosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
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

const expressaoNcm = sql`COALESCE(${saldoestoque.ncm}, ${produtos.ncm})`;
const expressaoUnidade = sql`COALESCE(${saldoestoque.unidademedida}, ${produtos.unidademedida})`;
const expressaoDivergencia = sql`(
	COALESCE(${saldoestoque.quantidade}::numeric, 0)
	- COALESCE(${saldoestoque.quantidadefiscal}::numeric, 0)
)`;

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

function filtroComDivergencia() {
	return sql`${expressaoDivergencia} <> 0`;
}

function filtroSemDivergencia() {
	return sql`${expressaoDivergencia} = 0`;
}

function joinSaldoPorProduto() {
	return and(
		eq(saldoestoque.idempresa, produtos.idempresa),
		eq(saldoestoque.codigoproduto, sql`${produtos.codigo}::text`),
	);
}

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

function montarOrdenacao(
	ordenarPor: OrdenarEstoqueSaldosCampo | undefined,
	ordem: "asc" | "desc" = "asc",
) {
	if (!ordenarPor) {
		return ordenacaoCodigoNumericoAsc(produtos.codigo);
	}

	const direcao = ordem === "desc" ? desc : asc;

	switch (ordenarPor) {
		case "codigo":
			return ordem === "desc"
				? sql`${produtos.codigo} DESC NULLS LAST`
				: ordenacaoCodigoNumericoAsc(produtos.codigo);
		case "nome":
			return direcao(produtos.nome);
		case "quantidade":
			return direcao(saldoestoque.quantidade);
		case "quantidadefiscal":
			return direcao(saldoestoque.quantidadefiscal);
		case "divergencia":
			return ordem === "desc"
				? sql`${expressaoDivergencia} DESC NULLS LAST`
				: sql`${expressaoDivergencia} ASC NULLS LAST`;
		case "ncm":
			return ordem === "desc"
				? sql`${expressaoNcm} DESC NULLS LAST`
				: sql`${expressaoNcm} ASC NULLS LAST`;
		case "unidademedida":
			return ordem === "desc"
				? sql`${expressaoUnidade} DESC NULLS LAST`
				: sql`${expressaoUnidade} ASC NULLS LAST`;
		default:
			return ordenacaoCodigoNumericoAsc(produtos.codigo);
	}
}

export async function listarEstoqueGestaoPorProdutos({
	idempresa,
	busca,
	codigoproduto,
	nomeproduto,
	ncm,
	unidademedida,
	somenteDivergencia,
	ordenarPor,
	ordem = "asc",
	page = 1,
	limit = 20,
}: ListarEstoqueGestaoPorProdutosParametros) {
	const where: SQL[] = [
		eq(produtos.idempresa, idempresa),
		filtroProdutoMercadoria() as SQL,
	];

	if (busca) {
		where.push(filtroBuscaProduto(busca) as SQL);
	}

	adicionarFiltroTexto(
		where,
		sql`${produtos.codigo}::text`,
		codigoproduto,
	);
	adicionarFiltroTexto(where, produtos.nome, nomeproduto);
	adicionarFiltroTexto(where, expressaoNcm, ncm);
	adicionarFiltroTexto(where, expressaoUnidade, unidademedida);

	if (somenteDivergencia === true) {
		where.push(filtroComDivergencia());
	} else if (somenteDivergencia === false) {
		where.push(filtroSemDivergencia());
	}

	const offset = (page - 1) * limit;
	const ordenacao = montarOrdenacao(ordenarPor, ordem);

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
				ncm: sql<string | null>`${expressaoNcm}`,
				unidademedida: sql<string | null>`${expressaoUnidade}`,
			})
			.from(produtos)
			.leftJoin(saldoestoque, joinSaldoPorProduto())
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		itens,
		total: totalCount[0]?.value ?? 0,
	};
}
