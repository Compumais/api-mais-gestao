import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { NovoProduto, Produto } from "@/model/produto-model";
import { departamento, produtos } from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { inteiroValidoParaPostgres } from "@/util/texto-util.js";
import { db } from "./connection";
import { ordenacaoCodigoNumericoAsc } from "./ordenacao-codigo.js";

export const ORDENAR_PRODUTOS_CAMPOS = [
	"codigo",
	"nome",
	"preco",
	"inativo",
	"ean",
	"referencia",
	"ncm",
	"unidademedida",
	"tipoproduto",
	"fornecedor",
	"custoaquisicao",
	"datacadastro",
	"codigolistalc11603",
	"codigonbs",
] as const;

export type OrdenarProdutosCampo = (typeof ORDENAR_PRODUTOS_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	codigo: produtos.codigo,
	nome: produtos.nome,
	preco: produtos.preco,
	inativo: produtos.inativo,
	ean: produtos.ean,
	referencia: produtos.referencia,
	ncm: produtos.ncm,
	unidademedida: produtos.unidademedida,
	tipoproduto: produtos.tipoproduto,
	fornecedor: produtos.fornecedor,
	custoaquisicao: produtos.custoaquisicao,
	datacadastro: produtos.datacadastro,
	codigolistalc11603: produtos.codigolistalc11603,
	codigonbs: produtos.codigonbs,
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

function filtroDataDia(coluna: typeof produtos.datacadastro, data: string) {
	return and(
		gte(coluna, `${data}T00:00:00.000`),
		lte(coluna, `${data}T23:59:59.999`),
	);
}

export async function criarProduto(dadosProduto: NovoProduto) {
	const [produto] = await db.insert(produtos).values(dadosProduto).returning();

	return produto;
}

export async function buscarProdutoPorId(id: string) {
	const [produto] = await db
		.select()
		.from(produtos)
		.where(eq(produtos.id, id))
		.limit(1);

	return produto;
}

export type ListarProdutosPorEmpresaParametros = {
	idempresas: string[];
	nome?: string | undefined;
	q?: string | undefined;
	inativo?: number | undefined;
	tipo?: "P" | "S" | undefined;
	codigo?: string | undefined;
	ean?: string | undefined;
	referencia?: string | undefined;
	ncm?: string | undefined;
	unidademedida?: string | undefined;
	tipoproduto?: string | undefined;
	fornecedor?: string | undefined;
	preco?: string | undefined;
	custoaquisicao?: string | undefined;
	datacadastro?: string | undefined;
	codigolistalc11603?: string | undefined;
	codigonbs?: string | undefined;
	ordenarPor?: OrdenarProdutosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarProdutosPorEmpresa({
	idempresas,
	nome,
	q,
	inativo,
	tipo,
	codigo,
	ean,
	referencia,
	ncm,
	unidademedida,
	tipoproduto,
	fornecedor,
	preco,
	custoaquisicao,
	datacadastro,
	codigolistalc11603,
	codigonbs,
	ordenarPor,
	ordem = "asc",
	page = 1,
	limit = 10,
}: ListarProdutosPorEmpresaParametros) {
	const where: SQL[] = [];

	if (idempresas.length === 0) {
		return {
			produtos: [],
			total: 0,
		};
	}

	where.push(inArray(produtos.idempresa, idempresas));

	if (nome) {
		where.push(ilike(produtos.nome, `%${nome}%`));
	}

	if (q) {
		const termo = `%${q}%`;
		const buscaOr = or(
			ilike(produtos.nome, termo),
			ilike(sql`${produtos.codigo}::text`, termo),
			ilike(sql`${produtos.ean}::text`, termo),
			ilike(sql`${produtos.preco}::text`, termo),
		);
		if (buscaOr) where.push(buscaOr);
	}

	if (tipo) {
		where.push(eq(produtos.tipo, tipo));
	}

	const filtroInativo = filtroRegistroAtivo(produtos.inativo, inativo);
	if (filtroInativo) {
		where.push(filtroInativo);
	}

	adicionarFiltroTexto(where, sql`${produtos.codigo}::text`, codigo);
	adicionarFiltroTexto(where, sql`${produtos.ean}::text`, ean);
	adicionarFiltroTexto(where, produtos.referencia, referencia);
	adicionarFiltroTexto(where, produtos.ncm, ncm);
	adicionarFiltroTexto(where, produtos.unidademedida, unidademedida);
	adicionarFiltroTexto(where, produtos.tipoproduto, tipoproduto);
	adicionarFiltroTexto(where, produtos.fornecedor, fornecedor);
	adicionarFiltroTexto(where, sql`${produtos.preco}::text`, preco);
	adicionarFiltroTexto(
		where,
		sql`${produtos.custoaquisicao}::text`,
		custoaquisicao,
	);
	adicionarFiltroTexto(where, produtos.codigolistalc11603, codigolistalc11603);
	adicionarFiltroTexto(where, produtos.codigonbs, codigonbs);
	if (datacadastro) {
		const condicao = filtroDataDia(produtos.datacadastro, datacadastro);
		if (condicao) where.push(condicao);
	}

	const offset = (page - 1) * limit;

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "desc"
				? desc(COLUNAS_ORDENACAO[ordenarPor])
				: asc(COLUNAS_ORDENACAO[ordenarPor])
			: ordenacaoCodigoNumericoAsc(produtos.codigo);

	const [totalCount, produtosListagem] = await Promise.all([
		db
			.select({ value: count() })
			.from(produtos)
			.where(and(...where)),
		db
			.select()
			.from(produtos)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		produtos: produtosListagem,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarProdutoPorCodigoOuEan(
	idempresa: string,
	codigo?: number | undefined,
	ean?: string | undefined,
) {
	const condicoes = [eq(produtos.idempresa, idempresa)];
	const alternativas = [];

	if (codigo !== undefined) {
		const codigoSeguro = inteiroValidoParaPostgres(codigo);
		if (codigoSeguro !== undefined) {
			alternativas.push(eq(produtos.codigo, codigoSeguro));
		}
	}

	if (ean) {
		alternativas.push(sql`cast(${produtos.ean} as text) = ${ean}`);
	}

	if (alternativas.length === 0) {
		return undefined;
	}

	const condicaoAlternativas = or(...alternativas);
	if (!condicaoAlternativas) return undefined;
	condicoes.push(condicaoAlternativas);

	const [produto] = await db
		.select()
		.from(produtos)
		.where(and(...condicoes))
		.limit(1);

	return produto;
}

export async function buscarProdutoPorDescricao(
	idempresa: string,
	descricao: string,
) {
	const [produto] = await db
		.select()
		.from(produtos)
		.where(
			and(
				eq(produtos.idempresa, idempresa),
				ilike(produtos.descricao, `%${descricao}%`),
			),
		)
		.limit(1);

	return produto;
}

export async function buscarProdutoPorNomeOuDescricao(
	idempresa: string,
	texto: string,
) {
	const termo = texto.trim();
	if (termo.length < 4) return undefined;

	const [exato] = await db
		.select()
		.from(produtos)
		.where(
			and(
				eq(produtos.idempresa, idempresa),
				or(ilike(produtos.nome, termo), ilike(produtos.descricao, termo)),
			),
		)
		.limit(1);
	if (exato) return exato;

	const [parcial] = await db
		.select()
		.from(produtos)
		.where(
			and(
				eq(produtos.idempresa, idempresa),
				or(
					ilike(produtos.nome, `%${termo}%`),
					ilike(produtos.descricao, `%${termo}%`),
				),
			),
		)
		.limit(1);

	return parcial;
}

export type ProdutoExportacaoMgv = {
	codigo: number | null;
	nome: string;
	descricao: string;
	preco: string | null;
	ean: string | null;
	pesavel: number | null;
	unidademedida: string | null;
	departamentoCodigo: string | null;
	exportaBalanca: number | null;
	diasValidade: number | null;
};

const LIMITE_EXPORTACAO_MGV = 50_000;

export async function listarProdutosParaExportacaoMgv(
	idempresa: string,
): Promise<ProdutoExportacaoMgv[]> {
	const condicoes: SQL[] = [
		eq(produtos.idempresa, idempresa),
		eq(produtos.tipo, "P"),
	];
	const filtroAtivo = filtroRegistroAtivo(produtos.inativo, 0);
	if (filtroAtivo) {
		condicoes.push(filtroAtivo);
	}

	return db
		.select({
			codigo: produtos.codigo,
			nome: produtos.nome,
			descricao: produtos.descricao,
			preco: produtos.preco,
			ean: produtos.ean,
			pesavel: produtos.pesavel,
			unidademedida: produtos.unidademedida,
			departamentoCodigo: departamento.codigo,
			exportaBalanca: produtos.exportaBalanca,
			diasValidade: produtos.diasValidade,
		})
		.from(produtos)
		.leftJoin(departamento, eq(produtos.iddepartamento, departamento.id))
		.where(and(...condicoes))
		.orderBy(ordenacaoCodigoNumericoAsc(produtos.codigo))
		.limit(LIMITE_EXPORTACAO_MGV);
}

export async function excluirProduto(id: string) {
	const [produto] = await db
		.delete(produtos)
		.where(eq(produtos.id, id))
		.returning();

	return produto;
}

export async function atualizarProduto(
	id: string,
	dadosProduto: Partial<NovoProduto>,
) {
	const [produto] = await db
		.update(produtos)
		.set(dadosProduto)
		.where(eq(produtos.id, id))
		.returning();

	return produto;
}

export async function buscarProdutosPorIds(ids: string[]) {
	if (ids.length === 0) {
		return [];
	}

	return db.select().from(produtos).where(inArray(produtos.id, ids));
}

export async function atualizarProdutosEmMassa(
	ids: string[],
	dadosProduto: Partial<NovoProduto>,
) {
	if (ids.length === 0) {
		return [];
	}

	return db
		.update(produtos)
		.set(dadosProduto)
		.where(inArray(produtos.id, ids))
		.returning();
}

export async function listarIdentificadoresProdutos(idempresa: string) {
	return db
		.select({
			id: produtos.id,
			codigo: produtos.codigo,
			ean: produtos.ean,
		})
		.from(produtos)
		.where(and(eq(produtos.idempresa, idempresa), eq(produtos.tipo, "P")));
}

export async function persistirImportacaoProdutos(parametros: {
	criar: NovoProduto[];
	atualizar: { id: string; dados: Partial<NovoProduto> }[];
}): Promise<{ criados: Produto[]; atualizados: Produto[] }> {
	return db.transaction(async (tx) => {
		const criados: Produto[] = [];
		const atualizados: Produto[] = [];

		for (const dados of parametros.criar) {
			const [produto] = await tx.insert(produtos).values(dados).returning();
			if (produto) {
				criados.push(produto);
			}
		}

		for (const item of parametros.atualizar) {
			const [produto] = await tx
				.update(produtos)
				.set(item.dados)
				.where(eq(produtos.id, item.id))
				.returning();
			if (produto) {
				atualizados.push(produto);
			}
		}

		return { criados, atualizados };
	});
}
