import { and, count, eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { NovaContaCorrente } from "@/model/conta-corrente-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function criarContaCorrente(
	dadosContaCorrente: NovaContaCorrente,
) {
	const contaCorrente = await db
		.insert(schema.contacorrente)
		.values(dadosContaCorrente)
		.returning();

	return contaCorrente[0];
}

export async function excluirContaCorrente({ id }: { id: string }) {
	const [planoContas] = await db
		.delete(schema.contacorrente)
		.where(eq(schema.contacorrente.id, id))
		.returning();

	return planoContas;
}

export async function buscarContaCorrentePorId({ id }: { id: string }) {
	const [contaCorrente] = await db
		.select()
		.from(schema.contacorrente)
		.where(eq(schema.contacorrente.id, id));

	return contaCorrente;
}

export type ListarContaCorrenteParametros = {
	idempresas: string[];
	page?: number;
	limit?: number;
};

export async function listarContaCorrentePorEmpresa({
	idempresas,
	page = 1,
	limit = 10,
}: ListarContaCorrenteParametros) {
	const where = [];

	if (idempresas.length === 0) {
		return {
			contasCorrentes: [],
			total: 0,
		};
	}

	where.push(inArray(schema.contacorrente.idempresa, idempresas));

	const offset = (page - 1) * limit;

	const [totalCount, contasCorrentes] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.contacorrente)
			.where(and(...where)),
		db
			.select({
				id: schema.contacorrente.id,
				agencia: schema.contacorrente.agencia,
				descricao: schema.contacorrente.descricao,
			})
			.from(schema.contacorrente)
			.where(and(...where))
			.orderBy(schema.contacorrente.idbanco)
			.limit(limit)
			.offset(offset),
	]);

	return {
		contasCorrentes,
		total: totalCount[0]?.value ?? 0,
	};
}

export type AtualizaContaCorrenteParametros = {
	id: string;
	dados: Partial<NovaContaCorrente>;
};

export async function atualizaContaCorrente({
	id,
	dados,
}: AtualizaContaCorrenteParametros) {
	const [contaCorrente] = await db
		.update(schema.contacorrente)
		.set(dados)
		.where(eq(schema.contacorrente.id, id))
		.returning();

	return contaCorrente;
}

export async function verificarContaCorrentePertenceEmpresa({
	idcontacorrente,
	idempresa,
}: {
	idcontacorrente: string;
	idempresa: string;
}) {
	const [contaCorrente] = await db
		.select()
		.from(schema.contacorrente)
		.where(
			and(
				eq(schema.contacorrente.id, idcontacorrente),
				eq(schema.contacorrente.idempresa, idempresa),
			),
		);

	return contaCorrente !== undefined;
}

export async function buscarContaCorrenteCaixaPadrao(idempresa: string) {
	const [contaCorrente] = await db
		.select()
		.from(schema.contacorrente)
		.where(
			and(
				eq(schema.contacorrente.idempresa, idempresa),
				eq(schema.contacorrente.caixapadrao, 1),
			),
		)
		.limit(1);

	return contaCorrente;
}

export async function criarContaCorrenteCaixaPadrao(idempresa: string) {
	const existente = await buscarContaCorrenteCaixaPadrao(idempresa);

	if (existente) {
		return existente;
	}

	const [contaCorrente] = await db
		.insert(schema.contacorrente)
		.values({
			id: uuidv4(),
			idempresa,
			descricao: "Caixa",
			caixa: 1,
			caixapadrao: 1,
			currenttimemillis: Date.now(),
		})
		.returning();

	return contaCorrente;
}
