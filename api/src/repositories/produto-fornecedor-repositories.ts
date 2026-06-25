import { and, eq } from "drizzle-orm";
import { produtofornecedor } from "@/repositories/schema.js";
import { db } from "./connection";

export type ProdutoFornecedor = typeof produtofornecedor.$inferSelect;
export type NovoProdutoFornecedor = typeof produtofornecedor.$inferInsert;

export async function buscarProdutoFornecedorPorCodigo(
	idempresa: string,
	identidade: string | undefined,
	codigofornecedor: string,
) {
	const where = [
		eq(produtofornecedor.idempresa, idempresa),
		eq(produtofornecedor.codigofornecedor, codigofornecedor),
	];

	if (identidade) {
		where.push(eq(produtofornecedor.identidade, identidade));
	}

	const [registro] = await db
		.select()
		.from(produtofornecedor)
		.where(and(...where))
		.limit(1);

	return registro;
}

export async function criarProdutoFornecedor(dados: NovoProdutoFornecedor) {
	const [registro] = await db
		.insert(produtofornecedor)
		.values(dados)
		.returning();

	return registro;
}

export async function vincularProdutoFornecedorSeNaoExistir(
	dados: NovoProdutoFornecedor,
) {
	const existente = await buscarProdutoFornecedorPorCodigo(
		dados.idempresa,
		dados.identidade ?? undefined,
		dados.codigofornecedor,
	);

	if (existente) {
		return existente;
	}

	return criarProdutoFornecedor(dados);
}
