import { and, asc, desc, eq, lte } from "drizzle-orm";
import type { AutomacaoParametros } from "../../drizzle/tables/automacao.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type Automacao = typeof schema.automacao.$inferSelect;
export type NovaAutomacao = typeof schema.automacao.$inferInsert;

export type ListarAutomacoesParametros = {
	idempresa: string;
};

export async function criarAutomacao(dados: NovaAutomacao) {
	const [registro] = await db
		.insert(schema.automacao)
		.values(dados)
		.returning();

	return registro;
}

export async function buscarAutomacaoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(schema.automacao)
		.where(eq(schema.automacao.id, id));

	return registro;
}

export async function listarAutomacoesPorEmpresa({
	idempresa,
}: ListarAutomacoesParametros) {
	return db
		.select()
		.from(schema.automacao)
		.where(eq(schema.automacao.idempresa, idempresa))
		.orderBy(desc(schema.automacao.criadoem));
}

export async function listarAutomacoesVencidas(agoraIso: string) {
	return db
		.select()
		.from(schema.automacao)
		.where(
			and(
				eq(schema.automacao.ativo, true),
				lte(schema.automacao.proximaexecucao, agoraIso),
			),
		)
		.orderBy(asc(schema.automacao.proximaexecucao));
}

export async function atualizarAutomacao(
	id: string,
	dados: Partial<{
		nome: string;
		funcao: string;
		ativo: boolean;
		recorrencia: string;
		horario: string;
		diames: number | null;
		diasemana: number | null;
		parametros: AutomacaoParametros | null;
		proximaexecucao: string | null;
		ultimaexecucao: string | null;
		statusultima: string | null;
		atualizadoem: string;
	}>,
) {
	const [registro] = await db
		.update(schema.automacao)
		.set(dados)
		.where(eq(schema.automacao.id, id))
		.returning();

	return registro;
}

export async function excluirAutomacao(id: string) {
	const [registro] = await db
		.delete(schema.automacao)
		.where(eq(schema.automacao.id, id))
		.returning();

	return registro;
}
