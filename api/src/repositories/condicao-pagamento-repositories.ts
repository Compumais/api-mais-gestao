import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoCondicaoPagamento } from "@/model/condicao-pagamento-model";
import { condicaopagamento } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarCondicaoPagamentoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(condicaopagamento)
		.where(eq(condicaopagamento.id, id));

	return registro;
}

export async function criarCondicaoPagamento(
	dadosCondicaoPagamento: NovoCondicaoPagamento,
) {
	const [registro] = await db
		.insert(condicaopagamento)
		.values(dadosCondicaoPagamento)
		.returning();

	return registro;
}

export async function atualizarCondicaoPagamento(
	id: string,
	dadosCondicaoPagamento: Partial<NovoCondicaoPagamento>,
) {
	const [registro] = await db
		.update(condicaopagamento)
		.set(dadosCondicaoPagamento)
		.where(eq(condicaopagamento.id, id))
		.returning();

	return registro;
}

export async function excluirCondicaoPagamento(id: string) {
	const [registro] = await db
		.delete(condicaopagamento)
		.where(eq(condicaopagamento.id, id))
		.returning();

	return registro;
}

export type ListarCondicoesPagamentoParametros = {
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarCondicoesPagamento({
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarCondicoesPagamentoParametros) {
	const where = [];

	where.push(eq(condicaopagamento.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(condicaopagamento.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(condicaopagamento.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, condicoespagamento] = await Promise.all([
		db
			.select({ value: count() })
			.from(condicaopagamento)
			.where(and(...where)),
		db
			.select()
			.from(condicaopagamento)
			.where(and(...where))
			.orderBy(desc(condicaopagamento.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		condicoespagamento,
		total: totalCount[0]?.value ?? 0,
	};
}
