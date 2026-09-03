import {
	and,
	asc,
	count,
	desc,
	eq,
	getTableColumns,
	gte,
	ilike,
	inArray,
	isNull,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { NovoProduto, Produto } from "@/model/produto-model";
import {
	cest,
	cfop,
	departamento,
	ncm,
	produtos,
} from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { inteiroValidoParaPostgres } from "@/util/texto-util.js";
import { normalizarCodigoCest } from "@/util/validar-cest-item-emissao-nfe.js";
import { db } from "./connection";
import { ordenacaoCodigoNumericoAsc } from "./ordenacao-codigo.js";

export const CAMPOS_PRODUTOS_EXPORTACAO = Object.keys(
	getTableColumns(produtos),
) as Array<keyof Produto>;

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

export async function listarTodosProdutosParaExportacao(
	idempresa: string,
): Promise<Produto[]> {
	// Cadastros legados sem tipo pertencem ao catálogo de produtos, como no PDV.
	const filtroTipoProduto = or(eq(produtos.tipo, "P"), isNull(produtos.tipo));

	return db
		.select(getTableColumns(produtos))
		.from(produtos)
		.where(and(eq(produtos.idempresa, idempresa), filtroTipoProduto))
		.orderBy(ordenacaoCodigoNumericoAsc(produtos.codigo), asc(produtos.nome));
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

export type ProdutoCatalogoPdv = {
	id: string;
	descricao: string;
	preco: string | null;
	unidademedida: string | null;
	idunidademedida: string | null;
	ean: string | null;
	codigo: number | null;
	idgrupo: string | null;
	idgrupogourmet: string | null;
	espizza: number | null;
	imagem: string | null;
	caminhoimagem: string | null;
	ncm: string | null;
	cest: string | null;
	cfop: string | null;
	cst: string | null;
	csosn: string | null;
	origem: number | null;
	aliquotaicms: string | null;
};

function digitosOuNulo(
	valor: string | number | null | undefined,
): string | null {
	if (valor == null) return null;
	const digitos = String(valor).replace(/\D/g, "");
	return digitos || null;
}

function primeiroCodigoCfop(
	...codigos: Array<string | null | undefined>
): string | null {
	for (const codigo of codigos) {
		const digitos = digitosOuNulo(codigo);
		if (digitos) return digitos;
	}
	return null;
}

export async function listarProdutosCatalogoPdv({
	idempresa,
	page = 1,
	limit = 100,
}: {
	idempresa: string;
	page?: number;
	limit?: number;
}): Promise<{ produtos: ProdutoCatalogoPdv[]; total: number }> {
	const cfopNfce = alias(cfop, "cfop_nfce_pdv");
	const cfopSaida = alias(cfop, "cfop_saida_pdv");
	const cfopExterna = alias(cfop, "cfop_ext_pdv");

	const condicoes: SQL[] = [eq(produtos.idempresa, idempresa)];
	const filtroTipo = or(eq(produtos.tipo, "P"), isNull(produtos.tipo));
	if (filtroTipo) {
		condicoes.push(filtroTipo);
	}
	const filtroAtivo = filtroRegistroAtivo(produtos.inativo, 0);
	if (filtroAtivo) {
		condicoes.push(filtroAtivo);
	}
	const where = and(...condicoes);
	const offset = (page - 1) * limit;

	const [totalCount, rows] = await Promise.all([
		db.select({ value: count() }).from(produtos).where(where),
		db
			.select({
				id: produtos.id,
				descricao: produtos.descricao,
				nome: produtos.nome,
				preco: produtos.preco,
				unidademedida: produtos.unidademedida,
				idunidademedida: produtos.idunidademedida,
				ean: produtos.ean,
				codigo: produtos.codigo,
				idgrupo: produtos.idgrupo,
				idgrupogourmet: produtos.idgrupogourmet,
				espizza: produtos.espizza,
				imagem: produtos.imagem,
				caminhoimagem: produtos.caminhoimagem,
				ncmProduto: produtos.ncm,
				ncmCadastro: ncm.codigo,
				cestCadastro: cest.codigo,
				cestLegado: produtos.cest,
				cfopNfceCodigo: cfopNfce.codigo,
				cfopSaidaCodigo: cfopSaida.codigo,
				cfopExternaCodigo: cfopExterna.codigo,
				situacaotributaria: produtos.situacaotributaria,
				tributacaosn: produtos.tributacaosn,
				situacaotributariasn: produtos.situacaotributariasn,
				origem: produtos.origem,
				aliquotaicms: produtos.icmssaida,
			})
			.from(produtos)
			.leftJoin(ncm, eq(produtos.idncm, ncm.id))
			.leftJoin(cest, eq(produtos.idcest, cest.id))
			.leftJoin(cfopNfce, eq(produtos.idcfopsaidanfce, cfopNfce.id))
			.leftJoin(cfopSaida, eq(produtos.idcfopsaida, cfopSaida.id))
			.leftJoin(cfopExterna, eq(produtos.idcfopsaidaexterna, cfopExterna.id))
			.where(where)
			.orderBy(ordenacaoCodigoNumericoAsc(produtos.codigo))
			.limit(limit)
			.offset(offset),
	]);

	const produtosCatalogo: ProdutoCatalogoPdv[] = rows.map((row) => {
		const ncmResolvido =
			digitosOuNulo(row.ncmProduto) ?? digitosOuNulo(row.ncmCadastro);
		const cestResolvido =
			normalizarCodigoCest(row.cestCadastro) ??
			normalizarCodigoCest(row.cestLegado) ??
			null;
		const cst = digitosOuNulo(row.situacaotributaria);
		const csosn =
			digitosOuNulo(row.tributacaosn) ??
			digitosOuNulo(row.situacaotributariasn);

		return {
			id: row.id,
			descricao: row.descricao || row.nome || "",
			preco: row.preco,
			unidademedida: row.unidademedida,
			idunidademedida: row.idunidademedida,
			ean: row.ean,
			codigo: row.codigo,
			idgrupo: row.idgrupo,
			idgrupogourmet: row.idgrupogourmet,
			espizza: row.espizza,
			imagem: row.imagem,
			caminhoimagem: row.caminhoimagem,
			ncm: ncmResolvido,
			cest: cestResolvido,
			cfop: primeiroCodigoCfop(
				row.cfopNfceCodigo,
				row.cfopSaidaCodigo,
				row.cfopExternaCodigo,
			),
			cst,
			csosn,
			origem: row.origem,
			aliquotaicms: row.aliquotaicms,
		};
	});

	return {
		produtos: produtosCatalogo,
		total: totalCount[0]?.value ?? 0,
	};
}
