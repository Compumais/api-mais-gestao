import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoOperacaoFiscal } from "@/model/operacao-fiscal-model";
import { operacaofiscal } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarOperacaoFiscalPorId(id: string) {
	const [registro] = await db
		.select()
		.from(operacaofiscal)
		.where(eq(operacaofiscal.id, id));

	return registro;
}

export async function criarOperacaoFiscal(
	dadosOperacaoFiscal: NovoOperacaoFiscal,
) {
	const [registro] = await db
		.insert(operacaofiscal)
		.values(dadosOperacaoFiscal)
		.returning();

	return registro;
}

export async function atualizarOperacaoFiscal(
	id: string,
	dadosOperacaoFiscal: Partial<NovoOperacaoFiscal>,
) {
	const [registro] = await db
		.update(operacaofiscal)
		.set(dadosOperacaoFiscal)
		.where(eq(operacaofiscal.id, id))
		.returning();

	return registro;
}

export async function excluirOperacaoFiscal(id: string) {
	const [registro] = await db
		.delete(operacaofiscal)
		.where(eq(operacaofiscal.id, id))
		.returning();

	return registro;
}

export type ListarOperacoesFiscaisParametros = {
	idempresa: string;
	nome?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarOperacoesFiscais({
	idempresa,
	nome,
	page = 1,
	limit = 10,
}: ListarOperacoesFiscaisParametros) {
	const where = [];

	where.push(eq(operacaofiscal.idempresa, idempresa));

	if (nome) {
		where.push(ilike(operacaofiscal.nome, `%${nome}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, operacoesfiscais] = await Promise.all([
		db
			.select({ value: count() })
			.from(operacaofiscal)
			.where(and(...where)),
		db
			.select()
			.from(operacaofiscal)
			.where(and(...where))
			.orderBy(desc(operacaofiscal.nome))
			.limit(limit)
			.offset(offset),
	]);

	return {
		operacoesfiscais,
		total: totalCount[0]?.value ?? 0,
	};
}
