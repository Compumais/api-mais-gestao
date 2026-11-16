import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import type { NovaContratoCobranca } from "@/model/contrato-model.js";
import { contratocobranca } from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function criarContratoCobranca(dados: NovaContratoCobranca) {
	const [registro] = await db
		.insert(contratocobranca)
		.values(dados)
		.returning();
	return registro;
}

export async function criarContratoCobrancaSeNaoExistir(
	dados: NovaContratoCobranca,
) {
	const [registro] = await db
		.insert(contratocobranca)
		.values(dados)
		.onConflictDoNothing({
			target: [
				contratocobranca.idempresa,
				contratocobranca.idcontrato,
				contratocobranca.competencia,
			],
		})
		.returning();
	return registro;
}

export async function buscarContratoCobrancaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(contratocobranca)
		.where(eq(contratocobranca.id, id));
	return registro;
}

export async function buscarContratoCobrancaPorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(contratocobranca)
		.where(
			and(
				eq(contratocobranca.id, id),
				eq(contratocobranca.idempresa, idempresa),
			),
		);
	return registro;
}

export async function buscarContratoCobrancaPorContratoCompetencia(
	idempresa: string,
	idcontrato: string,
	competencia: string,
) {
	const [registro] = await db
		.select()
		.from(contratocobranca)
		.where(
			and(
				eq(contratocobranca.idempresa, idempresa),
				eq(contratocobranca.idcontrato, idcontrato),
				eq(contratocobranca.competencia, competencia),
			),
		);
	return registro;
}

export async function atualizarContratoCobranca(
	id: string,
	dados: Partial<NovaContratoCobranca>,
) {
	const [registro] = await db
		.update(contratocobranca)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(contratocobranca.id, id))
		.returning();
	return registro;
}

export async function listarCobrancasPorLote(idlote: string) {
	return db
		.select()
		.from(contratocobranca)
		.where(eq(contratocobranca.idlote, idlote))
		.orderBy(desc(contratocobranca.criadoem));
}

export async function listarCobrancasPorStatus(
	statusfaturamento: string | string[],
) {
	const statuses = Array.isArray(statusfaturamento)
		? statusfaturamento
		: [statusfaturamento];
	return db
		.select()
		.from(contratocobranca)
		.where(inArray(contratocobranca.statusfaturamento, statuses));
}

export type ListarCobrancasParametros = {
	idempresa: string;
	idcontrato?: string | undefined;
	competencia?: string | undefined;
	idlote?: string | undefined;
	statusfaturamento?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarContratoCobrancas({
	idempresa,
	idcontrato,
	competencia,
	idlote,
	statusfaturamento,
	page = 1,
	limit = 50,
}: ListarCobrancasParametros) {
	const where: SQL[] = [eq(contratocobranca.idempresa, idempresa)];
	if (idcontrato) where.push(eq(contratocobranca.idcontrato, idcontrato));
	if (competencia?.trim()) {
		where.push(eq(contratocobranca.competencia, competencia.trim()));
	}
	if (idlote) where.push(eq(contratocobranca.idlote, idlote));
	if (statusfaturamento?.trim()) {
		where.push(
			eq(contratocobranca.statusfaturamento, statusfaturamento.trim()),
		);
	}

	const offset = (page - 1) * limit;
	const [totalCount, cobrancas] = await Promise.all([
		db
			.select({ value: count() })
			.from(contratocobranca)
			.where(and(...where)),
		db
			.select()
			.from(contratocobranca)
			.where(and(...where))
			.orderBy(desc(contratocobranca.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		cobrancas,
		total: totalCount[0]?.value ?? 0,
	};
}
