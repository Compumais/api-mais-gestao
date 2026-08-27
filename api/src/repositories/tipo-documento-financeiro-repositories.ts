import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	isNull,
	ne,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { NovoTipoDocumentoFinanceiro } from "@/model/tipo-documento-financeiro-model";
import { tipodocumentofinanceiro } from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { db } from "./connection";

export const ORDENAR_TIPOS_DOCUMENTO_FINANCEIRO_CAMPOS = [
	"descricao",
	"formapagamentonfe",
	"prazodias",
	"aprazo",
	"integracaixabanco",
] as const;

export type OrdenarTiposDocumentoFinanceiroCampo =
	(typeof ORDENAR_TIPOS_DOCUMENTO_FINANCEIRO_CAMPOS)[number];

export type DestinoTipoDocumentoFinanceiroFiltro =
	| "caixa"
	| "recebivel"
	| "contas_receber";

const COLUNAS_ORDENACAO = {
	descricao: tipodocumentofinanceiro.descricao,
	formapagamentonfe: tipodocumentofinanceiro.formapagamentonfe,
	prazodias: tipodocumentofinanceiro.prazodias,
	aprazo: tipodocumentofinanceiro.aprazo,
	integracaixabanco: tipodocumentofinanceiro.integracaixabanco,
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

function naoEhUm(
	coluna:
		| typeof tipodocumentofinanceiro.aprazo
		| typeof tipodocumentofinanceiro.integracaixabanco,
) {
	return or(isNull(coluna), ne(coluna, 1));
}

function filtroDestino(
	destino: DestinoTipoDocumentoFinanceiroFiltro,
): SQL | undefined {
	if (destino === "contas_receber") {
		return eq(tipodocumentofinanceiro.aprazo, 1);
	}

	if (destino === "caixa") {
		return and(
			eq(tipodocumentofinanceiro.integracaixabanco, 1),
			naoEhUm(tipodocumentofinanceiro.aprazo),
		);
	}

	return and(
		naoEhUm(tipodocumentofinanceiro.aprazo),
		naoEhUm(tipodocumentofinanceiro.integracaixabanco),
	);
}

export async function buscarTipoDocumentoFinanceiroPorId(id: string) {
	const [registro] = await db
		.select()
		.from(tipodocumentofinanceiro)
		.where(eq(tipodocumentofinanceiro.id, id));

	return registro;
}

export async function criarTipoDocumentoFinanceiro(
	dadosTipoDocumentoFinanceiro: NovoTipoDocumentoFinanceiro,
) {
	const [registro] = await db
		.insert(tipodocumentofinanceiro)
		.values(dadosTipoDocumentoFinanceiro)
		.returning();

	return registro;
}

export async function atualizarTipoDocumentoFinanceiro(
	id: string,
	dadosTipoDocumentoFinanceiro: Partial<NovoTipoDocumentoFinanceiro>,
) {
	const [registro] = await db
		.update(tipodocumentofinanceiro)
		.set(dadosTipoDocumentoFinanceiro)
		.where(eq(tipodocumentofinanceiro.id, id))
		.returning();

	return registro;
}

export async function excluirTipoDocumentoFinanceiro(id: string) {
	const [registro] = await db
		.delete(tipodocumentofinanceiro)
		.where(eq(tipodocumentofinanceiro.id, id))
		.returning();

	return registro;
}

export type ListarTiposDocumentoFinanceiroParametros = {
	idempresa: string;
	descricao?: string | undefined;
	formapagamentonfe?: string | undefined;
	prazodias?: string | undefined;
	destino?: DestinoTipoDocumentoFinanceiroFiltro | undefined;
	inativo?: number | undefined;
	ordenarPor?: OrdenarTiposDocumentoFinanceiroCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarTiposDocumentoFinanceiro({
	idempresa,
	descricao,
	formapagamentonfe,
	prazodias,
	destino,
	inativo,
	ordenarPor,
	ordem = "desc",
	page = 1,
	limit = 10,
}: ListarTiposDocumentoFinanceiroParametros) {
	const where: SQL[] = [eq(tipodocumentofinanceiro.idempresa, idempresa)];

	adicionarFiltroTexto(where, tipodocumentofinanceiro.descricao, descricao);
	adicionarFiltroTexto(
		where,
		tipodocumentofinanceiro.formapagamentonfe,
		formapagamentonfe,
	);
	adicionarFiltroTexto(
		where,
		sql`${tipodocumentofinanceiro.prazodias}::text`,
		prazodias,
	);

	if (destino) {
		const filtro = filtroDestino(destino);
		if (filtro) where.push(filtro);
	}

	if (inativo !== undefined) {
		const filtroInativo = filtroRegistroAtivo(
			tipodocumentofinanceiro.inativo,
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
			: desc(tipodocumentofinanceiro.descricao);

	const [totalCount, tiposdocumentofinanceiro] = await Promise.all([
		db
			.select({ value: count() })
			.from(tipodocumentofinanceiro)
			.where(and(...where)),
		db
			.select()
			.from(tipodocumentofinanceiro)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		tiposdocumentofinanceiro,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function listarTiposDocumentoFinanceiroAtivos(idempresa: string) {
	const filtroAtivo = filtroRegistroAtivo(tipodocumentofinanceiro.inativo, 0);
	return db
		.select()
		.from(tipodocumentofinanceiro)
		.where(
			and(
				eq(tipodocumentofinanceiro.idempresa, idempresa),
				...(filtroAtivo ? [filtroAtivo] : []),
			),
		);
}

export async function verificarEmpresaPossuiTiposDocumentoFinanceiro(
	idempresa: string,
) {
	const [resultado] = await db
		.select({ value: count() })
		.from(tipodocumentofinanceiro)
		.where(eq(tipodocumentofinanceiro.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarTiposDocumentoFinanceiroEmLote(
	registros: NovoTipoDocumentoFinanceiro[],
) {
	if (registros.length === 0) {
		return [];
	}

	return db.insert(tipodocumentofinanceiro).values(registros).returning();
}
