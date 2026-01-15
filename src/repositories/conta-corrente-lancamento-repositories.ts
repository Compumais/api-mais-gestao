import { desc, eq } from "drizzle-orm";
import type { NovaContaCorrenteLancamento } from "@/model/conta-corrente-lancamento-model";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function criarContaCorrenteLancamento(
	dados: NovaContaCorrenteLancamento,
) {
	const [contaCorrenteLancamento] = await db
		.insert(schema.contacorrentelancamento)
		.values(dados)
		.returning();

	return contaCorrenteLancamento;
}

export async function buscarContaCorrenteLancamentoPorId({
	id,
}: {
	id: string;
}) {
	const [contaCorrenteLancamento] = await db
		.select()
		.from(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.id, id));

	return contaCorrenteLancamento;
}

export async function buscarUltimoLancamentoContaCorrente({
	idcontacorrente,
}: {
	idcontacorrente: string;
}) {
	const [ultimoLancamento] = await db
		.select()
		.from(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente))
		.orderBy(
			desc(schema.contacorrentelancamento.datahora),
			desc(schema.contacorrentelancamento.currenttimemillis),
		)
		.limit(1);

	return ultimoLancamento;
}

export async function listarLancamentoContaCorrentePorEmpresa({
	idcontacorrente,
	page = 1,
	limit = 10,
}: {
	idcontacorrente: string;
	page?: number;
	limit?: number;
}) {
	const lancamentos = await db
		.select()
		.from(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente))
		.orderBy(desc(schema.contacorrentelancamento.datahora))
		.limit(limit)
		.offset((page - 1) * limit);

	return lancamentos;
}

export async function excluirLancamentoContaCorrente({ id }: { id: string }) {
	await db
		.delete(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.id, id))
		.returning();
}

export async function buscarLancamentoContaCorrentePorId({
	id,
}: {
	id: string;
}) {
	const [lancamento] = await db
		.select()
		.from(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.id, id));

	return lancamento;
}

export async function atualizarLancamentoContaCorrente({
	id,
	dados,
}: {
	id: string;
	dados: Partial<NovaContaCorrenteLancamento>;
}) {
	const [lancamento] = await db
		.update(schema.contacorrentelancamento)
		.set(dados)
		.where(eq(schema.contacorrentelancamento.id, id))
		.returning();

	return lancamento;
}
