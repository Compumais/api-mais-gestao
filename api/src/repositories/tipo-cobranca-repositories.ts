import { and, asc, count, desc, eq, ilike, type SQL, sql } from "drizzle-orm";
import type { NovoTipoCobranca } from "@/model/tipo-cobranca-model.js";
import { tipocobranca } from "@/repositories/schema.js";
import { db } from "./connection.js";

export const ORDENAR_TIPOS_COBRANCA_CAMPOS = [
	"codigo",
	"descricao",
	"idtipodocumentofinanceiro",
] as const;

export type OrdenarTiposCobrancaCampo =
	(typeof ORDENAR_TIPOS_COBRANCA_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	codigo: tipocobranca.codigo,
	descricao: tipocobranca.descricao,
	idtipodocumentofinanceiro: tipocobranca.idtipodocumentofinanceiro,
} as const;

export async function buscarTipoCobrancaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(tipocobranca)
		.where(eq(tipocobranca.id, id));

	return registro;
}

export async function criarTipoCobranca(dados: NovoTipoCobranca) {
	const [registro] = await db.insert(tipocobranca).values(dados).returning();

	return registro;
}

export async function atualizarTipoCobranca(
	id: string,
	dados: Partial<NovoTipoCobranca>,
) {
	const [registro] = await db
		.update(tipocobranca)
		.set(dados)
		.where(eq(tipocobranca.id, id))
		.returning();

	return registro;
}

export async function excluirTipoCobranca(id: string) {
	const [registro] = await db
		.delete(tipocobranca)
		.where(eq(tipocobranca.id, id))
		.returning();

	return registro;
}

export type ListarTiposCobrancaParametros = {
	idempresa: string;
	codigo?: string | undefined;
	descricao?: string | undefined;
	idtipodocumentofinanceiro?: string | undefined;
	ordenarPor?: OrdenarTiposCobrancaCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarTiposCobranca({
	idempresa,
	codigo,
	descricao,
	idtipodocumentofinanceiro,
	ordenarPor,
	ordem = "desc",
	page = 1,
	limit = 10,
}: ListarTiposCobrancaParametros) {
	const where: SQL[] = [eq(tipocobranca.idempresa, idempresa)];

	if (codigo?.trim()) {
		where.push(ilike(sql`${tipocobranca.codigo}::text`, `%${codigo.trim()}%`));
	}

	if (descricao?.trim()) {
		where.push(ilike(tipocobranca.descricao, `%${descricao.trim()}%`));
	}

	if (idtipodocumentofinanceiro) {
		where.push(
			eq(tipocobranca.idtipodocumentofinanceiro, idtipodocumentofinanceiro),
		);
	}

	const offset = (page - 1) * limit;
	const colunaOrdenacao = ordenarPor
		? COLUNAS_ORDENACAO[ordenarPor]
		: tipocobranca.descricao;
	const ordenacao =
		ordem === "asc" ? asc(colunaOrdenacao) : desc(colunaOrdenacao);

	const [totalCount, tiposCobranca] = await Promise.all([
		db
			.select({ value: count() })
			.from(tipocobranca)
			.where(and(...where)),
		db
			.select()
			.from(tipocobranca)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		tiposCobranca,
		total: totalCount[0]?.value ?? 0,
	};
}
