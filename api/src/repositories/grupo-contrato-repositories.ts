import { and, asc, count, desc, eq, ilike, type SQL, sql } from "drizzle-orm";
import type { NovoGrupoContrato } from "@/model/grupo-contrato-model.js";
import { grupocontrato } from "@/repositories/schema.js";
import { db } from "./connection.js";

export const ORDENAR_GRUPOS_CONTRATO_CAMPOS = [
	"codigo",
	"descricao",
] as const;

export type OrdenarGruposContratoCampo =
	(typeof ORDENAR_GRUPOS_CONTRATO_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	codigo: grupocontrato.codigo,
	descricao: grupocontrato.descricao,
} as const;

export async function buscarGrupoContratoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(grupocontrato)
		.where(eq(grupocontrato.id, id));
	return registro;
}

export async function criarGrupoContrato(dados: NovoGrupoContrato) {
	const [registro] = await db.insert(grupocontrato).values(dados).returning();
	return registro;
}

export async function atualizarGrupoContrato(
	id: string,
	dados: Partial<NovoGrupoContrato>,
) {
	const [registro] = await db
		.update(grupocontrato)
		.set(dados)
		.where(eq(grupocontrato.id, id))
		.returning();
	return registro;
}

export async function excluirGrupoContrato(id: string) {
	const [registro] = await db
		.delete(grupocontrato)
		.where(eq(grupocontrato.id, id))
		.returning();
	return registro;
}

export type ListarGruposContratoParametros = {
	idempresa: string;
	codigo?: string | undefined;
	descricao?: string | undefined;
	ordenarPor?: OrdenarGruposContratoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarGruposContrato({
	idempresa,
	codigo,
	descricao,
	ordenarPor,
	ordem = "asc",
	page = 1,
	limit = 10,
}: ListarGruposContratoParametros) {
	const where: SQL[] = [eq(grupocontrato.idempresa, idempresa)];

	if (codigo?.trim()) {
		where.push(ilike(sql`${grupocontrato.codigo}::text`, `%${codigo.trim()}%`));
	}
	if (descricao?.trim()) {
		where.push(ilike(grupocontrato.descricao, `%${descricao.trim()}%`));
	}

	const offset = (page - 1) * limit;
	const colunaOrdenacao = ordenarPor
		? COLUNAS_ORDENACAO[ordenarPor]
		: grupocontrato.codigo;
	const ordenacao =
		ordem === "asc" ? asc(colunaOrdenacao) : desc(colunaOrdenacao);

	const [totalCount, grupos] = await Promise.all([
		db
			.select({ value: count() })
			.from(grupocontrato)
			.where(and(...where)),
		db
			.select()
			.from(grupocontrato)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		grupos,
		total: totalCount[0]?.value ?? 0,
	};
}
