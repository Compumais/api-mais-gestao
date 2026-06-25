import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoSaldoEstoque } from "@/model/saldo-estoque-model";
import { saldoestoque } from "@/repositories/schema.js";
import { db } from "./connection";

export async function criarSaldoEstoque(dadosSaldoEstoque: NovoSaldoEstoque) {
	const [registro] = await db
		.insert(saldoestoque)
		.values(dadosSaldoEstoque)
		.returning();

	return registro;
}

export async function buscarSaldoEstoquePorId(id: number) {
	const [registro] = await db
		.select()
		.from(saldoestoque)
		.where(eq(saldoestoque.id, id));

	return registro;
}

export async function atualizarSaldoEstoque(
	id: number,
	dados: {
		cest?: string | null | undefined;
		cnpjfilial?: string | null | undefined;
		codigoproduto?: string | null | undefined;
		currenttimemillis?: number | null | undefined;
		hash?: number | null | undefined;
		idfilial?: number | null | undefined;
		idproduto?: number | null | undefined;
		ncm?: string | null | undefined;
		nomeproduto?: string | null | undefined;
		quantidade?: string | null | undefined;
		quantidadefiscal?: string | null | undefined;
		ultimaalteracao?: string | null | undefined;
		unidademedida?: string | null | undefined;
		variacao?: number | null | undefined;
	},
) {
	const [registro] = await db
		.update(saldoestoque)
		.set(dados)
		.where(eq(saldoestoque.id, id))
		.returning();

	return registro;
}

export async function excluirSaldoEstoque(id: number) {
	const [registro] = await db
		.delete(saldoestoque)
		.where(eq(saldoestoque.id, id))
		.returning();

	return registro;
}

export type ListarSaldosEstoqueParametros = {
	idempresa: string;
	nomeproduto?: string | undefined;
	codigoproduto?: string | undefined;
	idfilial?: number | undefined;
	idproduto?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarSaldosEstoque({
	idempresa,
	nomeproduto,
	codigoproduto,
	idfilial,
	idproduto,
	page = 1,
	limit = 10,
}: ListarSaldosEstoqueParametros) {
	const where = [eq(saldoestoque.idempresa, idempresa)];

	if (nomeproduto) {
		where.push(ilike(saldoestoque.nomeproduto, `%${nomeproduto}%`));
	}

	if (codigoproduto) {
		where.push(ilike(saldoestoque.codigoproduto, `%${codigoproduto}%`));
	}

	if (idfilial !== undefined) {
		where.push(eq(saldoestoque.idfilial, idfilial));
	}

	if (idproduto !== undefined) {
		where.push(eq(saldoestoque.idproduto, idproduto));
	}

	const offset = (page - 1) * limit;

	const [totalCount, saldosEstoque] = await Promise.all([
		db
			.select({ value: count() })
			.from(saldoestoque)
			.where(and(...where)),
		db
			.select()
			.from(saldoestoque)
			.where(and(...where))
			.orderBy(desc(saldoestoque.id))
			.limit(limit)
			.offset(offset),
	]);

	return {
		saldosEstoque,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarSaldoEstoquePorCodigoProduto(
	idempresa: string,
	codigoproduto: string,
) {
	const [registro] = await db
		.select()
		.from(saldoestoque)
		.where(
			and(
				eq(saldoestoque.idempresa, idempresa),
				eq(saldoestoque.codigoproduto, codigoproduto),
			),
		)
		.limit(1);

	return registro;
}
