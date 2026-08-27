import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	type SQL,
} from "drizzle-orm";
import type { NovoTipoProblema } from "@/model/tipo-problema-model";
import { tipoproblema } from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { db } from "./connection";

export const ORDENAR_TIPOS_PROBLEMA_CAMPOS = [
	"descricao",
	"codigo",
	"inativo",
] as const;

export type OrdenarTiposProblemaCampo =
	(typeof ORDENAR_TIPOS_PROBLEMA_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	descricao: tipoproblema.descricao,
	codigo: tipoproblema.codigo,
	inativo: tipoproblema.inativo,
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

export async function buscarTipoProblemaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(tipoproblema)
		.where(eq(tipoproblema.id, id));

	return registro;
}

export async function criarTipoProblema(dadosTipoProblema: NovoTipoProblema) {
	const [registro] = await db
		.insert(tipoproblema)
		.values(dadosTipoProblema)
		.returning();

	return registro;
}

export async function atualizarTipoProblema(
	id: string,
	dadosTipoProblema: Partial<NovoTipoProblema>,
) {
	const [registro] = await db
		.update(tipoproblema)
		.set(dadosTipoProblema)
		.where(eq(tipoproblema.id, id))
		.returning();

	return registro;
}

export async function excluirTipoProblema(id: string) {
	const [registro] = await db
		.delete(tipoproblema)
		.where(eq(tipoproblema.id, id))
		.returning();

	return registro;
}

export type ListarTiposProblemaParametros = {
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	inativo?: number | undefined;
	ordenarPor?: OrdenarTiposProblemaCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarTiposProblema({
	idempresa,
	descricao,
	codigo,
	inativo,
	ordenarPor,
	ordem = "desc",
	page = 1,
	limit = 10,
}: ListarTiposProblemaParametros) {
	const where: SQL[] = [eq(tipoproblema.idempresa, idempresa)];

	adicionarFiltroTexto(where, tipoproblema.descricao, descricao);
	adicionarFiltroTexto(where, tipoproblema.codigo, codigo);

	if (inativo !== undefined) {
		const filtroInativo = filtroRegistroAtivo(tipoproblema.inativo, inativo);
		if (filtroInativo) {
			where.push(filtroInativo);
		}
	}

	const offset = (page - 1) * limit;

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "asc"
				? asc(COLUNAS_ORDENACAO[ordenarPor])
				: desc(COLUNAS_ORDENACAO[ordenarPor])
			: desc(tipoproblema.descricao);

	const [totalCount, tiposproblema] = await Promise.all([
		db
			.select({ value: count() })
			.from(tipoproblema)
			.where(and(...where)),
		db
			.select()
			.from(tipoproblema)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		tiposproblema,
		total: totalCount[0]?.value ?? 0,
	};
}
