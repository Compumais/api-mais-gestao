import { and, count, eq, ilike, inArray, or, type SQL, sql } from "drizzle-orm";
import type { NovoProduto } from "@/model/produto-model";
import { departamento, produtos } from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { inteiroValidoParaPostgres } from "@/util/texto-util.js";
import { db } from "./connection";
import { ordenacaoCodigoNumericoAsc } from "./ordenacao-codigo.js";

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
	page?: number;
	limit?: number;
};

export async function listarProdutosPorEmpresa({
	idempresas,
	nome,
	q,
	inativo,
	tipo,
	page = 1,
	limit = 10,
}: ListarProdutosPorEmpresaParametros) {
	const where = [];

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
		where.push(
			or(
				ilike(produtos.nome, termo),
				ilike(sql`${produtos.codigo}::text`, termo),
				ilike(sql`${produtos.ean}::text`, termo),
				ilike(sql`${produtos.preco}::text`, termo),
			),
		);
	}

	if (tipo) {
		where.push(eq(produtos.tipo, tipo));
	}

	const filtroInativo = filtroRegistroAtivo(produtos.inativo, inativo);
	if (filtroInativo) {
		where.push(filtroInativo);
	}

	const offset = (page - 1) * limit;

	const [totalCount, produtosListagem] = await Promise.all([
		db
			.select({ value: count() })
			.from(produtos)
			.where(and(...where)),
		db
			.select()
			.from(produtos)
			.where(and(...where))
			.orderBy(ordenacaoCodigoNumericoAsc(produtos.codigo))
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
