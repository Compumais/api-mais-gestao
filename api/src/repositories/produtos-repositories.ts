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
	hierarquia,
	ncm,
	produtos,
	saldoestoque,
} from "@/repositories/schema.js";
import { LIMITE_EXPORTACAO_CSV } from "@/util/csv.js";
import { resolverImagemVariacao } from "@/service/produto/resolver-imagem-variacao.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { normalizarCamposNumericosProduto } from "@/util/normalizar-campos-numericos-produto.js";
import { inteiroValidoParaPostgres } from "@/util/texto-util.js";
import { normalizarCodigoCest } from "@/util/validar-cest-item-emissao-nfe.js";
import { db } from "./connection";
import {
	colunaProdutoFiltravel,
	ehColunaFiltroBoolean,
	type OrdenarProdutosCampoListagem,
	ORDENAR_PRODUTOS_CAMPOS_LISTAGEM,
	referenciaColunaProduto,
} from "@/util/produtos-meta-colunas.js";
import { ordenacaoCodigoNumericoAsc } from "./ordenacao-codigo.js";

export const ORDENAR_PRODUTOS_CAMPOS = ORDENAR_PRODUTOS_CAMPOS_LISTAGEM;

export type OrdenarProdutosCampo = OrdenarProdutosCampoListagem;

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

const expressaoDivergencia = sql`(
	COALESCE(${saldoestoque.quantidade}::numeric, 0)
	- COALESCE(${saldoestoque.quantidadefiscal}::numeric, 0)
)`;

function joinSaldoPorProduto() {
	return and(
		eq(saldoestoque.idempresa, produtos.idempresa),
		eq(saldoestoque.codigoproduto, sql`${produtos.codigo}::text`),
	);
}

function calcularDivergencia(
	operacional: string | null | undefined,
	fiscal: string | null | undefined,
): string {
	const op = Number.parseFloat(operacional ?? "0");
	const fi = Number.parseFloat(fiscal ?? "0");
	if (Number.isNaN(op) || Number.isNaN(fi)) return "0";
	return (op - fi).toFixed(6);
}

function montarOrdenacaoProdutos(
	ordenarPor: OrdenarProdutosCampo | undefined,
	ordem: "asc" | "desc" = "asc",
) {
	if (!ordenarPor) {
		return ordenacaoCodigoNumericoAsc(produtos.codigo);
	}

	if (ordenarPor === "quantidade") {
		return ordem === "desc"
			? desc(saldoestoque.quantidade)
			: asc(saldoestoque.quantidade);
	}
	if (ordenarPor === "quantidadefiscal") {
		return ordem === "desc"
			? desc(saldoestoque.quantidadefiscal)
			: asc(saldoestoque.quantidadefiscal);
	}
	if (ordenarPor === "divergencia") {
		return ordem === "desc"
			? sql`${expressaoDivergencia} DESC NULLS LAST`
			: sql`${expressaoDivergencia} ASC NULLS LAST`;
	}

	if (ordenarPor === "codigo") {
		return ordem === "desc"
			? desc(produtos.codigo)
			: ordenacaoCodigoNumericoAsc(produtos.codigo);
	}

	const coluna =
		COLUNAS_ORDENACAO[ordenarPor as keyof typeof COLUNAS_ORDENACAO];
	if (coluna) {
		return ordem === "desc" ? desc(coluna) : asc(coluna);
	}

	const colunaDinamica = referenciaColunaProduto(ordenarPor);
	if (colunaDinamica) {
		return ordem === "desc" ? desc(colunaDinamica) : asc(colunaDinamica);
	}

	return ordenacaoCodigoNumericoAsc(produtos.codigo);
}

export type ProdutoListagem = Produto & {
	quantidade: string;
	quantidadefiscal: string;
	divergencia: string;
	possuiSaldo: boolean;
	nomepai: string | null;
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

function filtroDataDia(coluna: typeof produtos.datacadastro, data: string) {
	return and(
		gte(coluna, `${data}T00:00:00.000`),
		lte(coluna, `${data}T23:59:59.999`),
	);
}

function aplicarFiltroColunaProduto(
	where: SQL[],
	campo: string,
	valor: string | undefined,
) {
	if (!valor?.trim()) return;

	if (campo === "inativo") {
		const filtroInativo = filtroRegistroAtivo(
			produtos.inativo,
			Number(valor),
		);
		if (filtroInativo) where.push(filtroInativo);
		return;
	}

	if (
		ehColunaFiltroBoolean(campo) &&
		campo !== "inativo" &&
		(valor === "0" || valor === "1")
	) {
		const colunaFlag = referenciaColunaProduto(campo);
		if (colunaFlag) {
			if (valor === "0") {
				const condicao = or(isNull(colunaFlag), eq(colunaFlag, 0));
				if (condicao) where.push(condicao);
			} else {
				where.push(eq(colunaFlag, 1));
			}
			return;
		}
	}

	if (campo === "divergencia") {
		if (valor === "com") {
			where.push(sql`${expressaoDivergencia} <> 0`);
		} else if (valor === "sem") {
			where.push(sql`${expressaoDivergencia} = 0`);
		}
		return;
	}

	if (campo === "quantidade") {
		adicionarFiltroTexto(
			where,
			sql`COALESCE(${saldoestoque.quantidade}::text, '0')`,
			valor,
		);
		return;
	}

	if (campo === "quantidadefiscal") {
		adicionarFiltroTexto(
			where,
			sql`COALESCE(${saldoestoque.quantidadefiscal}::text, '0')`,
			valor,
		);
		return;
	}

	if (campo === "nomepai") {
		adicionarFiltroTexto(
			where,
			sql`(SELECT pp.nome FROM produtos pp WHERE pp.id = ${produtos.idprodutopai} LIMIT 1)`,
			valor,
		);
		return;
	}

	if (campo === "datacadastro") {
		const condicao = filtroDataDia(produtos.datacadastro, valor.trim());
		if (condicao) where.push(condicao);
		return;
	}

	if (campo === "nome") {
		where.push(ilike(produtos.nome, `%${valor.trim()}%`));
		return;
	}

	if (!colunaProdutoFiltravel(campo)) return;

	const coluna = referenciaColunaProduto(campo);
	if (coluna) {
		adicionarFiltroTexto(where, sql`${coluna}::text`, valor);
	}
}

export async function criarProduto(dadosProduto: NovoProduto) {
	const [produto] = await db
		.insert(produtos)
		.values(normalizarCamposNumericosProduto(dadosProduto))
		.returning();

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
	somenteDivergencia?: boolean | undefined;
	idprodutopai?: string | undefined;
	filtrosColuna?: Record<string, string | undefined>;
	ordenarPor?: OrdenarProdutosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

function montarWhereProdutosListagem({
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
	somenteDivergencia,
	idprodutopai,
	filtrosColuna,
}: Omit<
	ListarProdutosPorEmpresaParametros,
	"page" | "limit" | "ordenarPor" | "ordem"
>): SQL[] {
	const where: SQL[] = [];

	where.push(inArray(produtos.idempresa, idempresas));

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

	if (idprodutopai) {
		where.push(eq(produtos.idprodutopai, idprodutopai));
	}

	const filtrosUnificados: Record<string, string | undefined> = {
		...(filtrosColuna ?? {}),
	};
	if (nome) filtrosUnificados.nome = nome;
	if (codigo) filtrosUnificados.codigo = codigo;
	if (ean) filtrosUnificados.ean = ean;
	if (referencia) filtrosUnificados.referencia = referencia;
	if (ncm) filtrosUnificados.ncm = ncm;
	if (unidademedida) filtrosUnificados.unidademedida = unidademedida;
	if (tipoproduto) filtrosUnificados.tipoproduto = tipoproduto;
	if (fornecedor) filtrosUnificados.fornecedor = fornecedor;
	if (preco) filtrosUnificados.preco = preco;
	if (custoaquisicao) filtrosUnificados.custoaquisicao = custoaquisicao;
	if (datacadastro) filtrosUnificados.datacadastro = datacadastro;
	if (codigolistalc11603) {
		filtrosUnificados.codigolistalc11603 = codigolistalc11603;
	}
	if (codigonbs) filtrosUnificados.codigonbs = codigonbs;
	if (inativo !== undefined) {
		filtrosUnificados.inativo = String(inativo);
	}
	if (somenteDivergencia === true) {
		filtrosUnificados.divergencia = "com";
	} else if (somenteDivergencia === false) {
		filtrosUnificados.divergencia = "sem";
	}

	for (const [campo, valor] of Object.entries(filtrosUnificados)) {
		aplicarFiltroColunaProduto(where, campo, valor);
	}

	return where;
}

function precisaJoinSaldo(params: {
	somenteDivergencia?: boolean | undefined;
	ordenarPor?: OrdenarProdutosCampo | undefined;
	filtrosColuna?: Record<string, string | undefined>;
}) {
	const filtros = params.filtrosColuna ?? {};
	return (
		params.somenteDivergencia !== undefined ||
		params.ordenarPor === "quantidade" ||
		params.ordenarPor === "quantidadefiscal" ||
		params.ordenarPor === "divergencia" ||
		filtros.quantidade?.trim() ||
		filtros.quantidadefiscal?.trim() ||
		filtros.divergencia?.trim()
	);
}

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
	somenteDivergencia,
	idprodutopai,
	filtrosColuna,
	ordenarPor,
	ordem = "asc",
	page = 1,
	limit = 10,
}: ListarProdutosPorEmpresaParametros) {
	if (idempresas.length === 0) {
		return {
			produtos: [],
			total: 0,
		};
	}

	const where = montarWhereProdutosListagem({
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
		somenteDivergencia,
		idprodutopai,
		filtrosColuna,
	});

	const offset = (page - 1) * limit;
	const ordenacao = montarOrdenacaoProdutos(ordenarPor, ordem);
	const joinSaldo = joinSaldoPorProduto();
	const produtoPai = alias(produtos, "produto_pai_listagem");
	const possuiImagemPropria = sql<boolean>`(
		COALESCE(NULLIF(${produtos.caminhoimagem}, ''), NULLIF(${produtos.imagem}, '')) IS NOT NULL
		OR EXISTS (
			SELECT 1 FROM "produtoimagem" pi
			WHERE pi.idproduto = ${produtos.id}
		)
	)`;

	const [totalCount, rows] = await Promise.all([
		db
			.select({ value: count() })
			.from(produtos)
			.leftJoin(saldoestoque, joinSaldo)
			.where(and(...where)),
		db
			.select({
				...getTableColumns(produtos),
				idsaldo: saldoestoque.id,
				quantidadeSaldo: saldoestoque.quantidade,
				quantidadefiscalSaldo: saldoestoque.quantidadefiscal,
				nomepai: produtoPai.nome,
				imagemPai: produtoPai.imagem,
				caminhoimagemPai: produtoPai.caminhoimagem,
				possuiImagemPropria,
			})
			.from(produtos)
			.leftJoin(saldoestoque, joinSaldo)
			.leftJoin(produtoPai, eq(produtos.idprodutopai, produtoPai.id))
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	const produtosListagem: ProdutoListagem[] = rows.map((row) => {
		const {
			idsaldo,
			quantidadeSaldo,
			quantidadefiscalSaldo,
			nomepai,
			imagemPai,
			caminhoimagemPai,
			possuiImagemPropria: possuiMidiaPropria,
			...produto
		} = row;
		const quantidade = quantidadeSaldo ?? "0";
		const quantidadefiscal = quantidadefiscalSaldo ?? "0";
		const imagemResolvida = resolverImagemVariacao({
			imagem: produto.imagem,
			caminhoimagem: produto.caminhoimagem,
			possuiImagemPropria: Boolean(possuiMidiaPropria),
			imagemPai,
			caminhoimagemPai,
		});

		return {
			...produto,
			imagem: imagemResolvida.imagem,
			caminhoimagem: imagemResolvida.caminhoimagem,
			nomepai: nomepai ?? null,
			quantidade,
			quantidadefiscal,
			divergencia: calcularDivergencia(quantidade, quantidadefiscal),
			possuiSaldo: idsaldo != null,
		};
	});

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

export type BuscarProdutosParaVinculoNfParametros = {
	idempresa: string;
	q?: string | undefined;
	codigo?: number | undefined;
	ean?: string | undefined;
	limit?: number;
};

export async function buscarProdutosParaVinculoNf({
	idempresa,
	q,
	codigo,
	ean,
	limit = 20,
}: BuscarProdutosParaVinculoNfParametros) {
	const limite = Math.min(Math.max(limit, 1), 20);
	const colunasResumo = {
		id: produtos.id,
		nome: produtos.nome,
		codigo: produtos.codigo,
		ean: produtos.ean,
		descricao: produtos.descricao,
	};

	if (codigo !== undefined || ean) {
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
			return [];
		}

		const condicaoAlternativas = or(...alternativas);
		if (!condicaoAlternativas) return [];

		return await db
			.select(colunasResumo)
			.from(produtos)
			.where(and(eq(produtos.idempresa, idempresa), condicaoAlternativas))
			.orderBy(asc(produtos.nome))
			.limit(limite);
	}

	const termo = q?.trim();
	if (!termo) {
		return [];
	}

	const buscaTexto = or(
		ilike(produtos.nome, `%${termo}%`),
		ilike(produtos.descricao, `%${termo}%`),
	);
	if (!buscaTexto) {
		return [];
	}

	return await db
		.select(colunasResumo)
		.from(produtos)
		.where(and(eq(produtos.idempresa, idempresa), buscaTexto))
		.orderBy(asc(produtos.nome))
		.limit(limite);
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

export type ProdutoParaExportacao = Produto & {
	grupo: string | null;
	ncmExportacao: string | null;
	cestExportacao: string | number | null;
	cfopEntradaExportacao: string | null;
	cfopSaidaExportacao: string | null;
	cfopNfceExportacao: string | null;
};

export type FiltrosExportacaoProdutos = Omit<
	ListarProdutosPorEmpresaParametros,
	"idempresas" | "page" | "limit"
> & {
	idempresa: string;
};

export async function listarTodosProdutosParaExportacao({
	idempresa,
	tipo,
	ordenarPor,
	ordem = "asc",
	...filtros
}: FiltrosExportacaoProdutos): Promise<ProdutoParaExportacao[]> {
	const where = montarWhereProdutosListagem({
		idempresas: [idempresa],
		tipo,
		...filtros,
	});

	if (!tipo) {
		const filtroTipoProduto = or(eq(produtos.tipo, "P"), isNull(produtos.tipo));
		if (filtroTipoProduto) where.push(filtroTipoProduto);
	}

	const grupoExportacao = alias(hierarquia, "grupo_exportacao_produtos");
	const ncmExportacao = alias(ncm, "ncm_exportacao_produtos");
	const cestExportacao = alias(cest, "cest_exportacao_produtos");
	const cfopEntrada = alias(cfop, "cfop_entrada_exportacao_produtos");
	const cfopSaida = alias(cfop, "cfop_saida_exportacao_produtos");
	const cfopNfce = alias(cfop, "cfop_nfce_exportacao_produtos");
	const ordenacao = ordenarPor
		? montarOrdenacaoProdutos(ordenarPor, ordem)
		: ordenacaoCodigoNumericoAsc(produtos.codigo);
	const usarJoinSaldo = precisaJoinSaldo({
		somenteDivergencia: filtros.somenteDivergencia,
		ordenarPor,
	});

	const consulta = db
		.select({
			...getTableColumns(produtos),
			grupo: grupoExportacao.nome,
			ncmExportacao: ncmExportacao.codigo,
			cestExportacao: cestExportacao.codigo,
			cfopEntradaExportacao: cfopEntrada.codigo,
			cfopSaidaExportacao: cfopSaida.codigo,
			cfopNfceExportacao: cfopNfce.codigo,
		})
		.from(produtos)
		.leftJoin(grupoExportacao, eq(produtos.idgrupo, grupoExportacao.id))
		.leftJoin(ncmExportacao, eq(produtos.idncm, ncmExportacao.id))
		.leftJoin(cestExportacao, eq(produtos.idcest, cestExportacao.id))
		.leftJoin(cfopEntrada, eq(produtos.idcfopentrada, cfopEntrada.id))
		.leftJoin(cfopSaida, eq(produtos.idcfopsaida, cfopSaida.id))
		.leftJoin(cfopNfce, eq(produtos.idcfopsaidanfce, cfopNfce.id));

	const consultaComSaldo = usarJoinSaldo
		? consulta.leftJoin(saldoestoque, joinSaldoPorProduto())
		: consulta;

	return consultaComSaldo
		.where(and(...where))
		.orderBy(ordenacao, asc(produtos.nome))
		.limit(LIMITE_EXPORTACAO_CSV);
}

export async function contarVariacoesDoProduto(idprodutopai: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(produtos)
		.where(eq(produtos.idprodutopai, idprodutopai));

	return resultado?.value ?? 0;
}

export async function atualizarTributacaoVariacoes(
	idprodutopai: string,
	tributacao: Partial<NovoProduto>,
) {
	if (Object.keys(tributacao).length === 0) return [];

	return db
		.update(produtos)
		.set(tributacao)
		.where(eq(produtos.idprodutopai, idprodutopai))
		.returning({ id: produtos.id });
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
		.set(normalizarCamposNumericosProduto(dadosProduto))
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
		.set(normalizarCamposNumericosProduto(dadosProduto))
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
			const [produto] = await tx
				.insert(produtos)
				.values(normalizarCamposNumericosProduto(dados))
				.returning();
			if (produto) {
				criados.push(produto);
			}
		}

		for (const item of parametros.atualizar) {
			const [produto] = await tx
				.update(produtos)
				.set(normalizarCamposNumericosProduto(item.dados))
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
	imagemurl: string | null;
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
	const produtoPai = alias(produtos, "produto_pai_catalogo");

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
				imagemPai: produtoPai.imagem,
				caminhoimagemPai: produtoPai.caminhoimagem,
				possuiImagemPropria: sql<boolean>`(
					COALESCE(NULLIF(${produtos.caminhoimagem}, ''), NULLIF(${produtos.imagem}, '')) IS NOT NULL
					OR EXISTS (
						SELECT 1 FROM "produtoimagem" pi
						WHERE pi.idproduto = ${produtos.id}
					)
				)`,
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
			.leftJoin(produtoPai, eq(produtos.idprodutopai, produtoPai.id))
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
		const imagemResolvida = resolverImagemVariacao({
			imagem: row.imagem,
			caminhoimagem: row.caminhoimagem,
			possuiImagemPropria: Boolean(row.possuiImagemPropria),
			imagemPai: row.imagemPai,
			caminhoimagemPai: row.caminhoimagemPai,
		});

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
			imagem: imagemResolvida.imagem,
			caminhoimagem: imagemResolvida.caminhoimagem,
			imagemurl: imagemResolvida.caminhoimagem?.startsWith("/produtos/")
				? imagemResolvida.caminhoimagem
				: null,
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
