import { and, count, eq, ilike, inArray } from "drizzle-orm";
import type { NovoProduto } from "@/model/produto-model";
import { produtos } from "@/repositories/schema.js";
import { ordenacaoCodigoNumericoAsc } from "./ordenacao-codigo.js";
import { db } from "./connection";

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
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarProdutosPorEmpresa({
	idempresas,
	nome,
	inativo,
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

	if (inativo !== undefined) {
		where.push(eq(produtos.inativo, inativo));
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
