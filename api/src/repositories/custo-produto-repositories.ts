import { and, count, desc, eq } from "drizzle-orm";
import type { NovoCustoProduto } from "@/model/custo-produto-model";
import type { NovoProduto } from "@/model/produto-model";
import { custoproduto, produtos } from "@/repositories/schema";
import { db } from "./connection";

export async function criarCustoProduto(dados: NovoCustoProduto) {
	const [registro] = await db.insert(custoproduto).values(dados).returning();

	return registro;
}

export async function criarCustosProdutoEmLote(dados: NovoCustoProduto[]) {
	if (dados.length === 0) {
		return [];
	}

	return db.insert(custoproduto).values(dados).returning();
}

export async function buscarCustoProdutoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(custoproduto)
		.where(eq(custoproduto.id, id))
		.limit(1);

	return registro;
}

export type ListarCustosPorProdutoParametros = {
	idproduto: string;
	page?: number;
	limit?: number;
};

export async function listarCustosPorProduto({
	idproduto,
	page = 1,
	limit = 10,
}: ListarCustosPorProdutoParametros) {
	const where = eq(custoproduto.idproduto, idproduto);
	const offset = (page - 1) * limit;

	const [totalCount, custos] = await Promise.all([
		db.select({ value: count() }).from(custoproduto).where(where),
		db
			.select()
			.from(custoproduto)
			.where(where)
			.orderBy(desc(custoproduto.datahora))
			.limit(limit)
			.offset(offset),
	]);

	return {
		custos,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarUltimoCustoProduto(idproduto: string) {
	const [registro] = await db
		.select()
		.from(custoproduto)
		.where(eq(custoproduto.idproduto, idproduto))
		.orderBy(desc(custoproduto.datahora))
		.limit(1);

	return registro;
}

export async function excluirCustoProduto(id: string) {
	const [registro] = await db
		.delete(custoproduto)
		.where(eq(custoproduto.id, id))
		.returning();

	return registro;
}

export type AtualizacaoProdutoCusto = {
	id: string;
	dados: Partial<NovoProduto>;
};

export async function registrarCustosNfEmTransacao(
	custos: NovoCustoProduto[],
	atualizacoesProdutos: AtualizacaoProdutoCusto[],
) {
	return db.transaction(async (tx) => {
		const custosCriados =
			custos.length > 0
				? await tx.insert(custoproduto).values(custos).returning()
				: [];

		for (const atualizacao of atualizacoesProdutos) {
			await tx
				.update(produtos)
				.set(atualizacao.dados)
				.where(eq(produtos.id, atualizacao.id));
		}

		return custosCriados;
	});
}
