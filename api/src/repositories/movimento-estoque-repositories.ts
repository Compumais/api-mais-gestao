import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoMovimentoEstoque } from "@/model/movimento-estoque-model";
import { movimentoestoque } from "@/repositories/schema.js";
import { db } from "./connection";

export async function criarMovimentoEstoque(dadosMovimentoEstoque: NovoMovimentoEstoque) {
	const [registro] = await db
		.insert(movimentoestoque)
		.values(dadosMovimentoEstoque)
		.returning();

	return registro;
}

export async function buscarMovimentoEstoquePorId(id: number) {
	const [registro] = await db
		.select()
		.from(movimentoestoque)
		.where(eq(movimentoestoque.id, id));

	return registro;
}

export async function listarMovimentosEstoquePorDocumento(idnotafiscal: string) {
	return db
		.select()
		.from(movimentoestoque)
		.where(eq(movimentoestoque.idoriginal, idnotafiscal));
}

export async function atualizarMovimentoEstoque(
	id: number,
	dados: {
		idempresa?: string | undefined;
		cancelado?: number | null | undefined;
		currenttimemillis?: number | null | undefined;
		custoaquisicao?: string | null | undefined;
		customedio?: string | null | undefined;
		custototal?: string | null | undefined;
		data?: string | null | undefined;
		datahora?: string | null | undefined;
		iditemoriginal?: string | null | undefined;
		idlocalestoque?: string | null | undefined;
		idlote?: string | null | undefined;
		idoriginal?: string | null | undefined;
		idproduto?: string | null | undefined;
		observacao?: string | null | undefined;
		pontoequilibrio?: string | null | undefined;
		precocusto?: string | null | undefined;
		precoultimacompra?: string | null | undefined;
		quantidadeentrada?: string | null | undefined;
		quantidadesaida?: string | null | undefined;
		tipodocumento?: number | null | undefined;
		tipoestoque?: number | null | undefined;
		valortotal?: string | null | undefined;
		variacao?: number | null | undefined;
	},
) {
	const [registro] = await db
		.update(movimentoestoque)
		.set(dados)
		.where(eq(movimentoestoque.id, id))
		.returning();

	return registro;
}

export async function excluirMovimentoEstoque(id: number) {
	const [registro] = await db
		.delete(movimentoestoque)
		.where(eq(movimentoestoque.id, id))
		.returning();

	return registro;
}

export type ListarMovimentosEstoqueParametros = {
	idempresa: string;
	idproduto?: string | undefined;
	idlocalestoque?: string | undefined;
	tipodocumento?: number | undefined;
	tipoestoque?: number | undefined;
	observacao?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarMovimentosEstoque({
	idempresa,
	idproduto,
	idlocalestoque,
	tipodocumento,
	tipoestoque,
	observacao,
	page = 1,
	limit = 10,
}: ListarMovimentosEstoqueParametros) {
	const where = [eq(movimentoestoque.idempresa, idempresa)];

	if (idproduto) {
		where.push(eq(movimentoestoque.idproduto, idproduto));
	}

	if (idlocalestoque) {
		where.push(eq(movimentoestoque.idlocalestoque, idlocalestoque));
	}

	if (tipodocumento !== undefined) {
		where.push(eq(movimentoestoque.tipodocumento, tipodocumento));
	}

	if (tipoestoque !== undefined) {
		where.push(eq(movimentoestoque.tipoestoque, tipoestoque));
	}

	if (observacao) {
		where.push(ilike(movimentoestoque.observacao, `%${observacao}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, movimentos] = await Promise.all([
		db
			.select({ value: count() })
			.from(movimentoestoque)
			.where(and(...where)),
		db
			.select()
			.from(movimentoestoque)
			.where(and(...where))
			.orderBy(desc(movimentoestoque.id))
			.limit(limit)
			.offset(offset),
	]);

	return {
		movimentos,
		total: totalCount[0]?.value ?? 0,
	};
}

