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
import type { NovoCondicaoPagamento } from "@/model/condicao-pagamento-model";
import { condicaopagamento } from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { db } from "./connection";

export const ORDENAR_CONDICOES_PAGAMENTO_CAMPOS = [
	"codigo",
	"descricao",
	"parcelas",
	"prazos",
	"escopo",
	"inativo",
] as const;

export type OrdenarCondicoesPagamentoCampo =
	(typeof ORDENAR_CONDICOES_PAGAMENTO_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	codigo: condicaopagamento.codigo,
	descricao: condicaopagamento.descricao,
	parcelas: condicaopagamento.parcelas,
	prazos: condicaopagamento.prazos,
	escopo: condicaopagamento.escopo,
	inativo: condicaopagamento.inativo,
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

export async function buscarCondicaoPagamentoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(condicaopagamento)
		.where(eq(condicaopagamento.id, id));

	return registro;
}

export async function criarCondicaoPagamento(
	dadosCondicaoPagamento: NovoCondicaoPagamento,
) {
	const [registro] = await db
		.insert(condicaopagamento)
		.values(dadosCondicaoPagamento)
		.returning();

	return registro;
}

export async function atualizarCondicaoPagamento(
	id: string,
	dadosCondicaoPagamento: Partial<NovoCondicaoPagamento>,
) {
	const [registro] = await db
		.update(condicaopagamento)
		.set(dadosCondicaoPagamento)
		.where(eq(condicaopagamento.id, id))
		.returning();

	return registro;
}

export async function excluirCondicaoPagamento(id: string) {
	const [registro] = await db
		.delete(condicaopagamento)
		.where(eq(condicaopagamento.id, id))
		.returning();

	return registro;
}

export type ListarCondicoesPagamentoParametros = {
	idempresa: string;
	codigo?: string | undefined;
	descricao?: string | undefined;
	parcelas?: string | undefined;
	prazos?: string | undefined;
	escopo?: number | undefined;
	inativo?: number | undefined;
	ordenarPor?: OrdenarCondicoesPagamentoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarCondicoesPagamento({
	idempresa,
	codigo,
	descricao,
	parcelas,
	prazos,
	escopo,
	inativo,
	ordenarPor,
	ordem = "desc",
	page = 1,
	limit = 10,
}: ListarCondicoesPagamentoParametros) {
	const where: SQL[] = [eq(condicaopagamento.idempresa, idempresa)];

	adicionarFiltroTexto(where, condicaopagamento.codigo, codigo);
	adicionarFiltroTexto(where, condicaopagamento.descricao, descricao);
	adicionarFiltroTexto(
		where,
		sql`${condicaopagamento.parcelas}::text`,
		parcelas,
	);
	adicionarFiltroTexto(where, condicaopagamento.prazos, prazos);

	if (escopo !== undefined) {
		where.push(eq(condicaopagamento.escopo, escopo));
	}

	if (inativo !== undefined) {
		const filtroInativo = filtroRegistroAtivo(
			condicaopagamento.inativo,
			inativo,
		);
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
			: desc(condicaopagamento.descricao);

	const [totalCount, condicoespagamento] = await Promise.all([
		db
			.select({ value: count() })
			.from(condicaopagamento)
			.where(and(...where)),
		db
			.select()
			.from(condicaopagamento)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		condicoespagamento,
		total: totalCount[0]?.value ?? 0,
	};
}
