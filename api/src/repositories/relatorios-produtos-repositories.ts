import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	ilike,
	isNull,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import {
	auditLogs,
	entidade,
	fichaproducao,
	hierarquia,
	movimentoestoque,
	notafiscal,
	notafiscalitem,
	produtos,
	saldoestoque,
	usuarios,
} from "@/repositories/schema.js";
import type { TipoRelatorioProduto } from "@/service/relatorios/produtos-catalogo.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { mapearSituacaoParaInativo } from "@/util/mapear-situacao-produto.js";
import { STATUS_NF_CONFIRMADA } from "@/util/nota-fiscal-constants.js";
import { db } from "./connection";
import { ordenacaoCodigoNumericoAsc } from "./ordenacao-codigo.js";

export type FiltrosRelatorioProdutos = {
	idempresa: string;
	q?: string;
	dataInicio?: string;
	dataFim?: string;
	situacao?: string;
	grupo?: string;
	fornecedor?: string;
	pendencia?: string;
	origem?: string;
	tipoEstoque?: string;
	diasSemMovimento?: number;
	margemMin?: number;
	margemMax?: number;
	page?: number;
	limit?: number;
	ordenarPor?: string;
	ordem?: "asc" | "desc";
};

export type CelulaRelatorioProduto = string | number | null;

export type LinhaRelatorioProduto = Record<string, CelulaRelatorioProduto>;

export type ResultadoRelatorioProdutos = {
	data: LinhaRelatorioProduto[];
	total: number;
	resumo: Record<string, string | number>;
	avisos?: string[];
};

const ORIGEM_DOCUMENTO: Record<string, number> = {
	pdv: 0,
	nota_fiscal: 1,
	acerto: 2,
};

const TIPO_ESTOQUE: Record<string, number> = {
	operacional: 0,
	fiscal: 1,
	ambos: 2,
};

function textoVazio(coluna: SQL): SQL {
	return sql`(${coluna} is null or btrim(${coluna}::text) = '')`;
}

function empurrarOu(where: SQL[], condicao: SQL | undefined) {
	if (condicao) where.push(condicao);
}

function joinSaldo() {
	return and(
		eq(saldoestoque.idempresa, produtos.idempresa),
		eq(saldoestoque.codigoproduto, sql`${produtos.codigo}::text`),
	);
}

function numero(valor: string | number | null | undefined): number {
	const n = Number(valor ?? 0);
	return Number.isFinite(n) ? n : 0;
}

function rotuloSituacao(inativo: number | null): string {
	return inativo === 1 ? "Inativo" : "Ativo";
}

function rotuloOrigem(tipo: number | null): string {
	if (tipo === 0) return "PDV";
	if (tipo === 1) return "Nota fiscal";
	if (tipo === 2) return "Acerto";
	if (tipo === 3) return "Produção";
	return "Outro";
}

function rotuloTipoEstoque(tipo: number | null): string {
	if (tipo === 1) return "Fiscal";
	if (tipo === 2) return "Ambos";
	return "Operacional";
}

function margemPercentual(
	preco: string | number | null,
	custo: string | number | null,
): number | null {
	const p = numero(preco);
	if (p === 0) return null;
	return Number((((p - numero(custo)) / p) * 100).toFixed(2));
}

function filtrosProdutoBase(filtros: FiltrosRelatorioProdutos): SQL[] {
	const where: SQL[] = [
		eq(produtos.idempresa, filtros.idempresa),
		eq(produtos.tipo, "P"),
	];

	const inativo = mapearSituacaoParaInativo(filtros.situacao);
	const filtroInativo = filtroRegistroAtivo(produtos.inativo, inativo);
	if (filtroInativo) where.push(filtroInativo);

	if (filtros.q?.trim()) {
		const termo = `%${filtros.q.trim()}%`;
		const busca = or(
			ilike(produtos.nome, termo),
			ilike(sql`${produtos.codigo}::text`, termo),
			ilike(sql`coalesce(${produtos.ean}, '')`, termo),
		);
		if (busca) where.push(busca);
	}

	if (filtros.grupo?.trim()) {
		const termo = `%${filtros.grupo.trim()}%`;
		empurrarOu(
			where,
			or(
				ilike(hierarquia.nome, termo),
				ilike(sql`coalesce(${hierarquia.codigo}, '')`, termo),
			),
		);
	}

	if (filtros.fornecedor?.trim()) {
		where.push(ilike(produtos.fornecedor, `%${filtros.fornecedor.trim()}%`));
	}

	return where;
}

function filtroPendencia(pendencia?: string): SQL | undefined {
	if (!pendencia) return undefined;

	const eanVazio = textoVazio(sql`${produtos.ean}`);
	const ncmVazio = textoVazio(sql`${produtos.ncm}`);
	const fotoVazia = and(
		textoVazio(sql`${produtos.caminhoimagem}`),
		textoVazio(sql`${produtos.caminhoicone}`),
	);
	const tributacaoVazia = and(
		textoVazio(sql`${produtos.situacaotributaria}`),
		textoVazio(sql`${produtos.situacaotributariasn}`),
	);
	const estoque = sql`COALESCE(${saldoestoque.quantidade}::numeric, 0)`;
	const preco = sql`COALESCE(${produtos.preco}::numeric, 0)`;
	const custo = sql`COALESCE(${produtos.custoaquisicao}::numeric, 0)`;

	switch (pendencia) {
		case "ean":
			return eanVazio;
		case "ncm":
			return ncmVazio;
		case "cest":
			return and(
				isNull(produtos.idcest),
				sql`(${produtos.cest} is null or ${produtos.cest} = 0)`,
			);
		case "preco":
			return sql`${preco} = 0`;
		case "fornecedor":
			return textoVazio(sql`${produtos.fornecedor}`);
		case "grupo":
			return isNull(produtos.idgrupo);
		case "tributacao":
			return tributacaoVazia;
		case "foto":
			return fotoVazia;
		case "duplicado":
			return sql`(
				exists (
					select 1 from produtos p2
					where p2.idempresa = ${produtos.idempresa}
					and p2.id <> ${produtos.id}
					and p2.codigo is not null
					and p2.codigo = ${produtos.codigo}
				)
				or exists (
					select 1 from produtos p3
					where p3.idempresa = ${produtos.idempresa}
					and p3.id <> ${produtos.id}
					and p3.ean is not null and btrim(p3.ean) <> ''
					and p3.ean = ${produtos.ean}
				)
			)`;
		case "margem_baixa":
			return sql`${preco} > 0 and ((${preco} - ${custo}) / ${preco}) * 100 < 10`;
		case "estoque_negativo":
		case "negativo":
			return sql`${estoque} < 0`;
		case "abaixo_minimo":
			return sql`${produtos.quantidademinima} is not null and ${estoque} < ${produtos.quantidademinima}`;
		case "sem_estoque":
			return sql`${estoque} = 0`;
		case "fator_invalido":
			return sql`${produtos.fatorconversao} is null or ${produtos.fatorconversao}::numeric <= 0`;
		case "sem_itens":
			return sql`not exists (
				select 1 from fichaproducao fp
				join fichaproducaoitem fi on fi.idfichaproducao = fp.id
				where fp.idprodutoacabado = ${produtos.id}
				and fp.ativo = 1
			)`;
		default:
			return undefined;
	}
}

function filtroMargem(filtros: FiltrosRelatorioProdutos): SQL | undefined {
	if (filtros.margemMin == null && filtros.margemMax == null) {
		return undefined;
	}
	const preco = sql`COALESCE(${produtos.preco}::numeric, 0)`;
	const custo = sql`COALESCE(${produtos.custoaquisicao}::numeric, 0)`;
	const margem = sql`case when ${preco} = 0 then null else ((${preco} - ${custo}) / ${preco}) * 100 end`;
	const partes: SQL[] = [sql`${margem} is not null`];
	if (filtros.margemMin != null) {
		partes.push(sql`${margem} >= ${filtros.margemMin}`);
	}
	if (filtros.margemMax != null) {
		partes.push(sql`${margem} <= ${filtros.margemMax}`);
	}
	return and(...partes);
}

function pendenciasLinha(row: {
	ean: string | null;
	ncm: string | null;
	cest: number | null;
	idcest: string | null;
	preco: string | null;
	fornecedor: string | null;
	idgrupo: string | null;
	situacaotributaria: string | null;
	situacaotributariasn: string | null;
	caminhoimagem: string | null;
	caminhoicone: string | null;
	estoque: string | null;
}): string {
	const itens: string[] = [];
	if (!row.ean?.trim()) itens.push("EAN");
	if (!row.ncm?.trim()) itens.push("NCM");
	if (row.idcest == null && (row.cest == null || row.cest === 0)) {
		itens.push("CEST");
	}
	if (numero(row.preco) === 0) itens.push("Preço");
	if (!row.fornecedor?.trim()) itens.push("Fornecedor");
	if (!row.idgrupo) itens.push("Grupo");
	if (!row.situacaotributaria?.trim() && !row.situacaotributariasn?.trim()) {
		itens.push("Tributação");
	}
	if (!row.caminhoimagem?.trim() && !row.caminhoicone?.trim()) {
		itens.push("Foto");
	}
	if (numero(row.estoque) < 0) itens.push("Estoque negativo");
	if (row.preco && numero(row.preco) > 0) {
		const margem = margemPercentual(row.preco, null);
		if (margem != null && margem < 10) itens.push("Margem baixa");
	}
	return itens.join(", ");
}

async function consultarQualidadeResumo(
	idempresa: string,
	where: SQL[],
): Promise<Record<string, string | number>> {
	const filtro = and(...where);
	const [row] = await db
		.select({
			total: sql<number>`count(*)::int`,
			ativos: sql<number>`count(*) filter (where coalesce(${produtos.inativo}, 0) = 0)::int`,
			inativos: sql<number>`count(*) filter (where ${produtos.inativo} = 1)::int`,
			sem_ean: sql<number>`count(*) filter (where ${produtos.ean} is null or btrim(${produtos.ean}) = '')::int`,
			sem_ncm: sql<number>`count(*) filter (where ${produtos.ncm} is null or btrim(${produtos.ncm}) = '')::int`,
			sem_cest: sql<number>`count(*) filter (where ${produtos.idcest} is null and coalesce(${produtos.cest}, 0) = 0)::int`,
			sem_preco: sql<number>`count(*) filter (where coalesce(${produtos.preco}::numeric, 0) = 0)::int`,
			sem_fornecedor: sql<number>`count(*) filter (where ${produtos.fornecedor} is null or btrim(${produtos.fornecedor}) = '')::int`,
			sem_grupo: sql<number>`count(*) filter (where ${produtos.idgrupo} is null)::int`,
			sem_tributacao: sql<number>`count(*) filter (
				where (${produtos.situacaotributaria} is null or btrim(${produtos.situacaotributaria}) = '')
				and (${produtos.situacaotributariasn} is null or btrim(${produtos.situacaotributariasn}) = '')
			)::int`,
			sem_foto: sql<number>`count(*) filter (
				where (${produtos.caminhoimagem} is null or btrim(${produtos.caminhoimagem}) = '')
				and (${produtos.caminhoicone} is null or btrim(${produtos.caminhoicone}) = '')
			)::int`,
			estoque_negativo: sql<number>`count(*) filter (where coalesce(${saldoestoque.quantidade}::numeric, 0) < 0)::int`,
			margem_baixa: sql<number>`count(*) filter (
				where coalesce(${produtos.preco}::numeric, 0) > 0
				and ((coalesce(${produtos.preco}::numeric, 0) - coalesce(${produtos.custoaquisicao}::numeric, 0)) / coalesce(${produtos.preco}::numeric, 1)) * 100 < 10
			)::int`,
		})
		.from(produtos)
		.leftJoin(hierarquia, eq(produtos.idgrupo, hierarquia.id))
		.leftJoin(saldoestoque, joinSaldo())
		.where(filtro);

	const [dupEan] = await db
		.select({
			valor: sql<number>`(
				select count(*)::int from (
					select ean from produtos
					where idempresa = ${idempresa}
					and tipo = 'P'
					and ean is not null and btrim(ean) <> ''
					group by ean
					having count(*) > 1
				) d
			)`,
		})
		.from(produtos)
		.where(eq(produtos.idempresa, idempresa))
		.limit(1);
	const [dupCodigo] = await db
		.select({
			valor: sql<number>`(
				select count(*)::int from (
					select codigo from produtos
					where idempresa = ${idempresa}
					and tipo = 'P'
					and codigo is not null
					group by codigo
					having count(*) > 1
				) d
			)`,
		})
		.from(produtos)
		.where(eq(produtos.idempresa, idempresa))
		.limit(1);

	return {
		total: row?.total ?? 0,
		ativos: row?.ativos ?? 0,
		inativos: row?.inativos ?? 0,
		sem_ean: row?.sem_ean ?? 0,
		sem_ncm: row?.sem_ncm ?? 0,
		sem_cest: row?.sem_cest ?? 0,
		sem_preco: row?.sem_preco ?? 0,
		sem_fornecedor: row?.sem_fornecedor ?? 0,
		sem_grupo: row?.sem_grupo ?? 0,
		sem_tributacao: row?.sem_tributacao ?? 0,
		sem_foto: row?.sem_foto ?? 0,
		ean_duplicado: dupEan?.valor ?? 0,
		codigo_duplicado: dupCodigo?.valor ?? 0,
		estoque_negativo: row?.estoque_negativo ?? 0,
		margem_baixa: row?.margem_baixa ?? 0,
	};
}

async function consultarProdutosBase(
	filtros: FiltrosRelatorioProdutos,
	mapear: (row: Record<string, unknown>) => LinhaRelatorioProduto,
	ordenarPadrao: SQL = ordenacaoCodigoNumericoAsc(produtos.codigo),
): Promise<{ data: LinhaRelatorioProduto[]; total: number }> {
	const where = filtrosProdutoBase(filtros);
	const pendencia = filtroPendencia(filtros.pendencia);
	if (pendencia) where.push(pendencia);
	const margem = filtroMargem(filtros);
	if (margem) where.push(margem);

	if (filtros.diasSemMovimento != null) {
		where.push(
			sql`(
				select max(m.data) from movimentoestoque m
				where m.idempresa = ${produtos.idempresa}
				and m.idproduto = ${produtos.id}
				and coalesce(m.cancelado, 0) = 0
			) is null
			or (
				select max(m.data) from movimentoestoque m
				where m.idempresa = ${produtos.idempresa}
				and m.idproduto = ${produtos.id}
				and coalesce(m.cancelado, 0) = 0
			) <= current_date - ${filtros.diasSemMovimento}::int
			`,
		);
	}

	const page = filtros.page ?? 1;
	const limit = filtros.limit ?? 20;
	const offset = (page - 1) * limit;
	const filtro = and(...where);

	const [totalCount, rows] = await Promise.all([
		db
			.select({ value: count() })
			.from(produtos)
			.leftJoin(hierarquia, eq(produtos.idgrupo, hierarquia.id))
			.leftJoin(saldoestoque, joinSaldo())
			.where(filtro),
		db
			.select({
				id: produtos.id,
				codigo: produtos.codigo,
				nome: produtos.nome,
				ean: produtos.ean,
				eantributavel: produtos.eantributavel,
				referencia: produtos.referencia,
				fornecedor: produtos.fornecedor,
				inativo: produtos.inativo,
				preco: produtos.preco,
				custoaquisicao: produtos.custoaquisicao,
				ncm: produtos.ncm,
				cest: produtos.cest,
				idcest: produtos.idcest,
				idgrupo: produtos.idgrupo,
				grupo: hierarquia.nome,
				situacaotributaria: produtos.situacaotributaria,
				situacaotributariasn: produtos.situacaotributariasn,
				origem: produtos.origem,
				unidademedida: produtos.unidademedida,
				fatorconversao: produtos.fatorconversao,
				quantidademinima: produtos.quantidademinima,
				caminhoimagem: produtos.caminhoimagem,
				caminhoicone: produtos.caminhoicone,
				datacadastro: produtos.datacadastro,
				estoque: saldoestoque.quantidade,
				estoquefiscal: saldoestoque.quantidadefiscal,
				ultimaalteracao: saldoestoque.ultimaalteracao,
			})
			.from(produtos)
			.leftJoin(hierarquia, eq(produtos.idgrupo, hierarquia.id))
			.leftJoin(saldoestoque, joinSaldo())
			.where(filtro)
			.orderBy(
				filtros.ordenarPor === "nome"
					? filtros.ordem === "desc"
						? desc(produtos.nome)
						: asc(produtos.nome)
					: ordenarPadrao,
			)
			.limit(limit)
			.offset(offset),
	]);

	return {
		data: rows.map((row) => mapear(row as Record<string, unknown>)),
		total: totalCount[0]?.value ?? 0,
	};
}

async function consultarMovimentacoes(
	filtros: FiltrosRelatorioProdutos,
): Promise<{ data: LinhaRelatorioProduto[]; total: number }> {
	const where: SQL[] = [
		eq(movimentoestoque.idempresa, filtros.idempresa),
		sql`coalesce(${movimentoestoque.cancelado}, 0) = 0`,
	];
	if (filtros.dataInicio) {
		where.push(gte(movimentoestoque.data, filtros.dataInicio));
	}
	if (filtros.dataFim) {
		where.push(lte(movimentoestoque.data, filtros.dataFim));
	}
	if (filtros.q?.trim()) {
		const termo = `%${filtros.q.trim()}%`;
		empurrarOu(
			where,
			or(
				ilike(produtos.nome, termo),
				ilike(sql`${produtos.codigo}::text`, termo),
			),
		);
	}
	const origem = filtros.origem ? ORIGEM_DOCUMENTO[filtros.origem] : undefined;
	if (origem != null) {
		where.push(eq(movimentoestoque.tipodocumento, origem));
	} else if (filtros.origem === "producao") {
		where.push(eq(movimentoestoque.tipodocumento, 3));
	} else if (filtros.origem === "outro") {
		where.push(
			sql`${movimentoestoque.tipodocumento} is null or ${movimentoestoque.tipodocumento} not in (0, 1, 2, 3)`,
		);
	}
	const tipoEstoque = filtros.tipoEstoque
		? TIPO_ESTOQUE[filtros.tipoEstoque]
		: undefined;
	if (tipoEstoque != null) {
		where.push(eq(movimentoestoque.tipoestoque, tipoEstoque));
	}

	const page = filtros.page ?? 1;
	const limit = filtros.limit ?? 20;
	const offset = (page - 1) * limit;
	const filtro = and(...where);

	const [totalCount, rows] = await Promise.all([
		db
			.select({ value: count() })
			.from(movimentoestoque)
			.leftJoin(produtos, eq(movimentoestoque.idproduto, produtos.id))
			.where(filtro),
		db
			.select({
				datahora: movimentoestoque.datahora,
				data: movimentoestoque.data,
				codigo: produtos.codigo,
				nome: produtos.nome,
				tipodocumento: movimentoestoque.tipodocumento,
				tipoestoque: movimentoestoque.tipoestoque,
				entrada: movimentoestoque.quantidadeentrada,
				saida: movimentoestoque.quantidadesaida,
			})
			.from(movimentoestoque)
			.leftJoin(produtos, eq(movimentoestoque.idproduto, produtos.id))
			.where(filtro)
			.orderBy(desc(movimentoestoque.datahora))
			.limit(limit)
			.offset(offset),
	]);

	return {
		data: rows.map((row) => ({
			data: row.datahora ?? row.data,
			codigo: row.codigo,
			nome: row.nome,
			origem: rotuloOrigem(row.tipodocumento),
			tipoEstoque: rotuloTipoEstoque(row.tipoestoque),
			entrada: numero(row.entrada),
			saida: numero(row.saida),
		})),
		total: totalCount[0]?.value ?? 0,
	};
}

async function consultarComercial(
	filtros: FiltrosRelatorioProdutos,
): Promise<{ data: LinhaRelatorioProduto[]; total: number }> {
	const where: SQL[] = [
		eq(movimentoestoque.idempresa, filtros.idempresa),
		sql`coalesce(${movimentoestoque.cancelado}, 0) = 0`,
		sql`coalesce(${movimentoestoque.quantidadesaida}::numeric, 0) > 0`,
	];
	if (filtros.dataInicio) {
		where.push(gte(movimentoestoque.data, filtros.dataInicio));
	}
	if (filtros.dataFim) {
		where.push(lte(movimentoestoque.data, filtros.dataFim));
	}
	if (filtros.q?.trim()) {
		const termo = `%${filtros.q.trim()}%`;
		empurrarOu(
			where,
			or(
				ilike(produtos.nome, termo),
				ilike(sql`${produtos.codigo}::text`, termo),
			),
		);
	}
	const filtro = and(...where);
	const page = filtros.page ?? 1;
	const limit = filtros.limit ?? 20;
	const offset = (page - 1) * limit;

	const agrupado = db
		.select({
			idproduto: movimentoestoque.idproduto,
			codigo: produtos.codigo,
			nome: produtos.nome,
			custo: produtos.custoaquisicao,
			quantidade: sql<string>`sum(coalesce(${movimentoestoque.quantidadesaida}::numeric, 0))`,
			valor: sql<string>`sum(coalesce(${movimentoestoque.valortotal}::numeric, 0))`,
		})
		.from(movimentoestoque)
		.innerJoin(produtos, eq(movimentoestoque.idproduto, produtos.id))
		.where(filtro)
		.groupBy(
			movimentoestoque.idproduto,
			produtos.codigo,
			produtos.nome,
			produtos.custoaquisicao,
		)
		.as("comercial");

	const [totalCount, rows] = await Promise.all([
		db.select({ value: count() }).from(agrupado),
		db
			.select()
			.from(agrupado)
			.orderBy(desc(sql`valor`))
			.limit(limit)
			.offset(offset),
	]);

	return {
		data: rows.map((row) => ({
			codigo: row.codigo,
			nome: row.nome,
			quantidade: numero(row.quantidade),
			valor: numero(row.valor),
			custo: numero(row.custo),
			margem: margemPercentual(row.valor, row.custo),
		})),
		total: totalCount[0]?.value ?? 0,
	};
}

async function consultarCompras(
	filtros: FiltrosRelatorioProdutos,
): Promise<{ data: LinhaRelatorioProduto[]; total: number }> {
	const where: SQL[] = [
		eq(notafiscal.idempresa, filtros.idempresa),
		eq(notafiscal.tipoorigem, 0),
		eq(notafiscal.status, STATUS_NF_CONFIRMADA),
	];
	if (filtros.dataInicio) {
		where.push(gte(notafiscal.emissao, filtros.dataInicio));
	}
	if (filtros.dataFim) {
		where.push(lte(notafiscal.emissao, filtros.dataFim));
	}
	if (filtros.q?.trim()) {
		const termo = `%${filtros.q.trim()}%`;
		empurrarOu(
			where,
			or(
				ilike(produtos.nome, termo),
				ilike(sql`${produtos.codigo}::text`, termo),
			),
		);
	}
	if (filtros.fornecedor?.trim()) {
		empurrarOu(
			where,
			or(
				ilike(entidade.nome, `%${filtros.fornecedor.trim()}%`),
				ilike(
					sql`coalesce(${entidade.cnpjcpf}, '')`,
					`%${filtros.fornecedor.trim()}%`,
				),
			),
		);
	}

	const filtro = and(...where);
	const page = filtros.page ?? 1;
	const limit = filtros.limit ?? 20;
	const offset = (page - 1) * limit;

	const agrupado = db
		.select({
			idproduto: notafiscalitem.idproduto,
			codigo: produtos.codigo,
			nome: produtos.nome,
			fornecedor: sql<string>`max(${entidade.nome})`,
			quantidade: sql<string>`sum(coalesce(${notafiscalitem.quantidade}::numeric, 0))`,
			valor: sql<string>`sum(coalesce(${notafiscalitem.total}::numeric, 0))`,
			ultimaCompra: sql<string>`max(${notafiscal.emissao})`,
		})
		.from(notafiscalitem)
		.innerJoin(notafiscal, eq(notafiscalitem.idnotafiscal, notafiscal.id))
		.leftJoin(produtos, eq(notafiscalitem.idproduto, produtos.id))
		.leftJoin(entidade, eq(notafiscal.identidade, entidade.id))
		.where(filtro)
		.groupBy(notafiscalitem.idproduto, produtos.codigo, produtos.nome)
		.as("compras");

	const [totalCount, rows] = await Promise.all([
		db.select({ value: count() }).from(agrupado),
		db
			.select()
			.from(agrupado)
			.orderBy(desc(sql`valor`))
			.limit(limit)
			.offset(offset),
	]);

	return {
		data: rows.map((row) => ({
			codigo: row.codigo,
			nome: row.nome,
			fornecedor: row.fornecedor,
			quantidade: numero(row.quantidade),
			valor: numero(row.valor),
			ultimaCompra: row.ultimaCompra,
		})),
		total: totalCount[0]?.value ?? 0,
	};
}

async function consultarComposicao(
	filtros: FiltrosRelatorioProdutos,
): Promise<{ data: LinhaRelatorioProduto[]; total: number }> {
	const where = filtrosProdutoBase(filtros);
	if (filtros.pendencia === "sem_itens") {
		where.push(
			sql`not exists (
				select 1 from fichaproducaoitem fi
				where fi.idfichaproducao = ${fichaproducao.id}
			)`,
		);
	}
	const filtro = and(...where);
	const page = filtros.page ?? 1;
	const limit = filtros.limit ?? 20;
	const offset = (page - 1) * limit;

	const [totalCount, rows] = await Promise.all([
		db
			.select({ value: count() })
			.from(produtos)
			.leftJoin(hierarquia, eq(produtos.idgrupo, hierarquia.id))
			.innerJoin(
				fichaproducao,
				and(
					eq(fichaproducao.idprodutoacabado, produtos.id),
					eq(fichaproducao.ativo, 1),
				),
			)
			.where(filtro),
		db
			.select({
				codigo: produtos.codigo,
				nome: produtos.nome,
				inativo: produtos.inativo,
				producaonavenda: fichaproducao.producaonavenda,
				componentes: sql<number>`(
					select count(*) from fichaproducaoitem fi
					where fi.idfichaproducao = ${fichaproducao.id}
				)::int`,
			})
			.from(produtos)
			.leftJoin(hierarquia, eq(produtos.idgrupo, hierarquia.id))
			.innerJoin(
				fichaproducao,
				and(
					eq(fichaproducao.idprodutoacabado, produtos.id),
					eq(fichaproducao.ativo, 1),
				),
			)
			.where(filtro)
			.orderBy(ordenacaoCodigoNumericoAsc(produtos.codigo))
			.limit(limit)
			.offset(offset),
	]);

	return {
		data: rows.map((row) => ({
			codigo: row.codigo,
			nome: row.nome,
			componentes: row.componentes,
			producaoNaVenda: row.producaonavenda === 1 ? "Sim" : "Não",
			situacao: rotuloSituacao(row.inativo),
		})),
		total: totalCount[0]?.value ?? 0,
	};
}

async function consultarAuditoria(
	filtros: FiltrosRelatorioProdutos,
): Promise<{ data: LinhaRelatorioProduto[]; total: number }> {
	const where: SQL[] = [
		eq(auditLogs.idempresa, filtros.idempresa),
		eq(auditLogs.recurso, "produto"),
	];
	if (filtros.dataInicio) {
		where.push(gte(auditLogs.criadoem, `${filtros.dataInicio}T00:00:00.000`));
	}
	if (filtros.dataFim) {
		where.push(lte(auditLogs.criadoem, `${filtros.dataFim}T23:59:59.999`));
	}
	if (filtros.q?.trim()) {
		const termo = `%${filtros.q.trim()}%`;
		empurrarOu(
			where,
			or(
				ilike(auditLogs.acao, termo),
				ilike(usuarios.nome, termo),
				ilike(sql`coalesce(${auditLogs.idrecurso}, '')`, termo),
			),
		);
	}

	const filtro = and(...where);
	const page = filtros.page ?? 1;
	const limit = filtros.limit ?? 20;
	const offset = (page - 1) * limit;

	const [totalCount, rows] = await Promise.all([
		db
			.select({ value: count() })
			.from(auditLogs)
			.leftJoin(usuarios, eq(auditLogs.idusuario, usuarios.id))
			.where(filtro),
		db
			.select({
				criadoem: auditLogs.criadoem,
				acao: auditLogs.acao,
				usuario: usuarios.nome,
				idrecurso: auditLogs.idrecurso,
				metadados: auditLogs.metadados,
			})
			.from(auditLogs)
			.leftJoin(usuarios, eq(auditLogs.idusuario, usuarios.id))
			.where(filtro)
			.orderBy(desc(auditLogs.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		data: rows.map((row) => {
			const meta =
				row.metadados && typeof row.metadados === "object"
					? (row.metadados as { nome?: string })
					: {};
			return {
				data: row.criadoem,
				acao: row.acao,
				usuario: row.usuario,
				produto: meta.nome ?? null,
				idrecurso: row.idrecurso,
			};
		}),
		total: totalCount[0]?.value ?? 0,
	};
}

export async function consultarRelatorioProdutosDados(
	tipo: TipoRelatorioProduto,
	filtros: FiltrosRelatorioProdutos,
): Promise<ResultadoRelatorioProdutos> {
	if (tipo === "movimentacoes") {
		const resultado = await consultarMovimentacoes(filtros);
		return { ...resultado, resumo: { total: resultado.total } };
	}
	if (tipo === "comercial") {
		const resultado = await consultarComercial(filtros);
		return { ...resultado, resumo: { total: resultado.total } };
	}
	if (tipo === "compras") {
		const resultado = await consultarCompras(filtros);
		return { ...resultado, resumo: { total: resultado.total } };
	}
	if (tipo === "composicao") {
		const resultado = await consultarComposicao(filtros);
		return { ...resultado, resumo: { total: resultado.total } };
	}
	if (tipo === "auditoria") {
		const resultado = await consultarAuditoria(filtros);
		return { ...resultado, resumo: { total: resultado.total } };
	}

	const mapear = (row: Record<string, unknown>): LinhaRelatorioProduto => {
		const situacao = rotuloSituacao(row.inativo as number | null);
		const preco = row.preco as string | null;
		const custo = row.custoaquisicao as string | null;
		const estoque = row.estoque as string | null;
		switch (tipo) {
			case "qualidade":
				return {
					codigo: row.codigo as number | null,
					nome: row.nome as string,
					situacao,
					pendencias: pendenciasLinha({
						ean: row.ean as string | null,
						ncm: row.ncm as string | null,
						cest: row.cest as number | null,
						idcest: row.idcest as string | null,
						preco,
						fornecedor: row.fornecedor as string | null,
						idgrupo: row.idgrupo as string | null,
						situacaotributaria: row.situacaotributaria as string | null,
						situacaotributariasn: row.situacaotributariasn as string | null,
						caminhoimagem: row.caminhoimagem as string | null,
						caminhoicone: row.caminhoicone as string | null,
						estoque,
					}),
					preco: numero(preco),
					estoque: numero(estoque),
				};
			case "ean":
				return {
					codigo: row.codigo as number | null,
					nome: row.nome as string,
					ean: row.ean as string | null,
					eantributavel: row.eantributavel as string | null,
					referencia: row.referencia as string | null,
					situacao,
				};
			case "precos":
				return {
					codigo: row.codigo as number | null,
					nome: row.nome as string,
					grupo: row.grupo as string | null,
					preco: numero(preco),
					custo: numero(custo),
					margem: margemPercentual(preco, custo),
				};
			case "estoque":
				return {
					codigo: row.codigo as number | null,
					nome: row.nome as string,
					grupo: row.grupo as string | null,
					estoque: numero(estoque),
					estoquefiscal: numero(row.estoquefiscal as string | null),
					minimo: row.quantidademinima as number | null,
					ultimaMovimentacao: row.ultimaalteracao as string | null,
				};
			case "fiscal":
				return {
					codigo: row.codigo as number | null,
					nome: row.nome as string,
					ncm: row.ncm as string | null,
					cest: row.cest as number | null,
					cst: row.situacaotributaria as string | null,
					csosn: row.situacaotributariasn as string | null,
					origem: row.origem as number | null,
					situacao,
				};
			case "unidades":
				return {
					codigo: row.codigo as number | null,
					nome: row.nome as string,
					unidade: row.unidademedida as string | null,
					fator: numero(row.fatorconversao as string | null),
					situacao,
				};
			default:
				return {
					codigo: row.codigo as number | null,
					nome: row.nome as string,
					ean: row.ean as string | null,
					grupo: row.grupo as string | null,
					fornecedor: row.fornecedor as string | null,
					situacao,
					preco: numero(preco),
					ncm: row.ncm as string | null,
					datacadastro: row.datacadastro as string | null,
				};
		}
	};

	const resultado = await consultarProdutosBase(filtros, mapear);
	let resumo: Record<string, string | number> = { total: resultado.total };
	if (tipo === "qualidade") {
		const where = filtrosProdutoBase(filtros);
		resumo = await consultarQualidadeResumo(filtros.idempresa, where);
	}

	return { ...resultado, resumo };
}
