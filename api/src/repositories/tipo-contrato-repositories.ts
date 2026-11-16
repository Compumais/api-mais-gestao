import { and, asc, count, desc, eq, ilike, type SQL, sql } from "drizzle-orm";
import type { NovoTipoContrato } from "@/model/tipo-contrato-model.js";
import { tipocontrato } from "@/repositories/schema.js";
import { db } from "./connection.js";

export const ORDENAR_TIPOS_CONTRATO_CAMPOS = [
	"codigo",
	"descricao",
	"valor",
] as const;

export type OrdenarTiposContratoCampo =
	(typeof ORDENAR_TIPOS_CONTRATO_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	codigo: tipocontrato.codigo,
	descricao: tipocontrato.descricao,
	valor: tipocontrato.valor,
} as const;

export async function buscarTipoContratoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(tipocontrato)
		.where(eq(tipocontrato.id, id));

	return registro;
}

export async function criarTipoContrato(dados: NovoTipoContrato) {
	const [registro] = await db.insert(tipocontrato).values(dados).returning();
	return registro;
}

export async function atualizarTipoContrato(
	id: string,
	dados: Partial<NovoTipoContrato>,
) {
	const [registro] = await db
		.update(tipocontrato)
		.set(dados)
		.where(eq(tipocontrato.id, id))
		.returning();

	return registro;
}

export async function excluirTipoContrato(id: string) {
	const [registro] = await db
		.delete(tipocontrato)
		.where(eq(tipocontrato.id, id))
		.returning();

	return registro;
}

export type ListarTiposContratoParametros = {
	idempresa: string;
	codigo?: string | undefined;
	descricao?: string | undefined;
	ordenarPor?: OrdenarTiposContratoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarTiposContrato({
	idempresa,
	codigo,
	descricao,
	ordenarPor,
	ordem = "asc",
	page = 1,
	limit = 10,
}: ListarTiposContratoParametros) {
	const where: SQL[] = [eq(tipocontrato.idempresa, idempresa)];

	if (codigo?.trim()) {
		where.push(ilike(sql`${tipocontrato.codigo}::text`, `%${codigo.trim()}%`));
	}

	if (descricao?.trim()) {
		where.push(ilike(tipocontrato.descricao, `%${descricao.trim()}%`));
	}

	const offset = (page - 1) * limit;
	const colunaOrdenacao = ordenarPor
		? COLUNAS_ORDENACAO[ordenarPor]
		: tipocontrato.codigo;
	const ordenacao =
		ordem === "asc" ? asc(colunaOrdenacao) : desc(colunaOrdenacao);

	const [totalCount, tiposContrato] = await Promise.all([
		db
			.select({ value: count() })
			.from(tipocontrato)
			.where(and(...where)),
		db
			.select()
			.from(tipocontrato)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		tiposContrato,
		total: totalCount[0]?.value ?? 0,
	};
}
