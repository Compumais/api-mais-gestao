import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	type SQL,
} from "drizzle-orm";
import type { NovaBandeiraCartao } from "@/model/bandeira-cartao-model";
import { bandeiracartao } from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { db } from "./connection";

export const ORDENAR_BANDEIRAS_CARTAO_CAMPOS = [
	"descricao",
	"codigo",
	"inativo",
] as const;

export type OrdenarBandeirasCartaoCampo =
	(typeof ORDENAR_BANDEIRAS_CARTAO_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	descricao: bandeiracartao.descricao,
	codigo: bandeiracartao.codigo,
	inativo: bandeiracartao.inativo,
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

export async function buscarBandeiraCartaoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(bandeiracartao)
		.where(eq(bandeiracartao.id, id));

	return registro;
}

export async function criarBandeiraCartao(dados: NovaBandeiraCartao) {
	const [registro] = await db.insert(bandeiracartao).values(dados).returning();

	return registro;
}

export async function atualizarBandeiraCartao(
	id: string,
	dados: Partial<NovaBandeiraCartao>,
) {
	const [registro] = await db
		.update(bandeiracartao)
		.set(dados)
		.where(eq(bandeiracartao.id, id))
		.returning();

	return registro;
}

export async function excluirBandeiraCartao(id: string) {
	const [registro] = await db
		.delete(bandeiracartao)
		.where(eq(bandeiracartao.id, id))
		.returning();

	return registro;
}

export type ListarBandeirasCartaoParametros = {
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	inativo?: number | undefined;
	ordenarPor?: OrdenarBandeirasCartaoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarBandeirasCartao({
	idempresa,
	descricao,
	codigo,
	inativo,
	ordenarPor,
	ordem = "desc",
	page = 1,
	limit = 10,
}: ListarBandeirasCartaoParametros) {
	const where: SQL[] = [eq(bandeiracartao.idempresa, idempresa)];

	adicionarFiltroTexto(where, bandeiracartao.descricao, descricao);
	adicionarFiltroTexto(where, bandeiracartao.codigo, codigo);

	if (inativo !== undefined) {
		const filtroInativo = filtroRegistroAtivo(bandeiracartao.inativo, inativo);
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
			: desc(bandeiracartao.descricao);

	const [totalCount, bandeiras] = await Promise.all([
		db
			.select({ value: count() })
			.from(bandeiracartao)
			.where(and(...where)),
		db
			.select()
			.from(bandeiracartao)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		bandeiras,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function verificarEmpresaPossuiBandeirasCartao(idempresa: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(bandeiracartao)
		.where(eq(bandeiracartao.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarBandeirasCartaoEmLote(
	registros: NovaBandeiraCartao[],
) {
	if (registros.length === 0) {
		return [];
	}

	return db.insert(bandeiracartao).values(registros).returning();
}
