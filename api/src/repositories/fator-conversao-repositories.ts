import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	type SQL,
	sql,
} from "drizzle-orm";
import type { NovoFatorConversao } from "@/model/fator-conversao-model.js";
import { fatorconversao } from "@/repositories/schema.js";
import { db } from "./connection";

export const ORDENAR_FATORES_CONVERSAO_CAMPOS = ["nome", "fator"] as const;

export type OrdenarFatoresConversaoCampo =
	(typeof ORDENAR_FATORES_CONVERSAO_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	nome: fatorconversao.nome,
	fator: fatorconversao.fator,
} as const;

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

export async function buscarFatorConversaoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(fatorconversao)
		.where(eq(fatorconversao.id, id));

	return registro;
}

export async function verificarEmpresaPossuiFatoresConversao(
	idempresa: string,
): Promise<boolean> {
	const [resultado] = await db
		.select({ value: count() })
		.from(fatorconversao)
		.where(eq(fatorconversao.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarFatorConversao(dados: NovoFatorConversao) {
	const [registro] = await db
		.insert(fatorconversao)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarFatorConversao(
	id: string,
	dados: Partial<NovoFatorConversao>,
) {
	const [registro] = await db
		.update(fatorconversao)
		.set(dados)
		.where(eq(fatorconversao.id, id))
		.returning();

	return registro;
}

export async function excluirFatorConversao(id: string) {
	const [registro] = await db
		.delete(fatorconversao)
		.where(eq(fatorconversao.id, id))
		.returning();

	return registro;
}

export type ListarFatoresConversaoParametros = {
	idempresa: string;
	q?: string | undefined;
	nome?: string | undefined;
	fator?: string | undefined;
	ordenarPor?: OrdenarFatoresConversaoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarFatoresConversao({
	idempresa,
	q,
	nome,
	fator,
	ordenarPor,
	ordem = "asc",
	page = 1,
	limit = 10,
}: ListarFatoresConversaoParametros) {
	const where: SQL[] = [eq(fatorconversao.idempresa, idempresa)];

	if (q) {
		where.push(ilike(fatorconversao.nome, `%${q}%`));
	}

	adicionarFiltroTexto(where, fatorconversao.nome, nome);
	adicionarFiltroTexto(where, sql`${fatorconversao.fator}::text`, fator);

	const offset = (page - 1) * limit;
	const filtro = and(...where);

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "desc"
				? desc(COLUNAS_ORDENACAO[ordenarPor])
				: asc(COLUNAS_ORDENACAO[ordenarPor])
			: asc(fatorconversao.nome);

	const [totalCount, fatores] = await Promise.all([
		db.select({ value: count() }).from(fatorconversao).where(filtro),
		db
			.select()
			.from(fatorconversao)
			.where(filtro)
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		fatores,
		total: totalCount[0]?.value ?? 0,
	};
}
