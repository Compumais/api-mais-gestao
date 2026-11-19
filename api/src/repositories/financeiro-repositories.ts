import {
	and,
	asc,
	count,
	desc,
	eq,
	getTableColumns,
	gte,
	ilike,
	inArray,
	isNull,
	lte,
	or,
	sql,
	type SQL,
} from "drizzle-orm";
import type { NovoFinanceiro } from "@/model/financeiro-model.js";
import * as schema from "@/repositories/schema.js";
import { db } from "./connection.js";

export const ORDENAR_FINANCEIROS_CAMPOS = [
	"documento",
	"tipodocumentodescricao",
	"emitente",
	"nomecliente",
	"historico",
	"parcela",
	"status",
	"emissao",
	"vencimento",
	"valor",
	"saldo",
	"currenttimemillis",
] as const;

export type OrdenarFinanceirosCampo =
	(typeof ORDENAR_FINANCEIROS_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	documento: schema.financeiro.documento,
	tipodocumentodescricao: schema.tipodocumentofinanceiro.descricao,
	emitente: schema.financeiro.emitente,
	nomecliente: sql<string>`coalesce(
		nullif(trim(${schema.entidade.razaosocial}), ''),
		nullif(trim(${schema.entidade.nome}), ''),
		nullif(trim(${schema.financeiro.emitente}), '')
	)`,
	historico: schema.financeiro.historico,
	parcela: schema.financeiro.parcela,
	status: schema.financeiro.status,
	emissao: schema.financeiro.emissao,
	vencimento: schema.financeiro.vencimento,
	valor: schema.financeiro.valor,
	saldo: schema.financeiro.saldo,
	currenttimemillis: schema.financeiro.currenttimemillis,
} as const;

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | null | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

export async function criarFinanceiro(data: NovoFinanceiro) {
	const [financeiro] = await db
		.insert(schema.financeiro)
		.values(data)
		.returning();

	return financeiro;
}

export async function criarFinanceiros(dados: NovoFinanceiro[]) {
	if (dados.length === 0) return [];
	return db.transaction((tx) =>
		tx.insert(schema.financeiro).values(dados).returning(),
	);
}

export async function buscarFinanceiroPorId(id: string) {
	const [financeiro] = await db
		.select()
		.from(schema.financeiro)
		.where(eq(schema.financeiro.id, id));

	return financeiro;
}

export async function buscarFinanceiroPorNossoNumero(params: {
	idempresa: string;
	nossonumero: string;
}) {
	const digitos = params.nossonumero.replace(/\D/g, "");
	const candidatos = [
		params.nossonumero.trim(),
		digitos,
		digitos.padStart(11, "0"),
		digitos.replace(/^0+/, ""),
	];
	const unicos = [...new Set(candidatos.filter((c) => c.length > 0))];

	for (const candidato of unicos) {
		const [titulo] = await db
			.select()
			.from(schema.financeiro)
			.where(
				and(
					eq(schema.financeiro.idempresa, params.idempresa),
					eq(schema.financeiro.nossonumero, candidato),
				),
			)
			.limit(1);
		if (titulo) return titulo;
	}

	return undefined;
}

export async function deletarFinanceiro(id: string) {
	const resultado = await db
		.delete(schema.financeiro)
		.where(eq(schema.financeiro.id, id));

	return resultado;
}

export async function atualizarFinanceiro(
	id: string,
	data: Partial<NovoFinanceiro>,
) {
	const [financeiro] = await db
		.update(schema.financeiro)
		.set(data)
		.where(eq(schema.financeiro.id, id))
		.returning();

	return financeiro;
}

export async function buscarFinanceirosPorOrigem(
	idempresa: string,
	tipoorigem: number,
	idorigem: string,
) {
	return db
		.select()
		.from(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipoorigem, tipoorigem),
				eq(schema.financeiro.idorigem, idorigem),
			),
		);
}

export async function excluirFinanceirosPorOrigem(
	idempresa: string,
	tipoorigem: number,
	idorigem: string,
) {
	const removidos = await db
		.delete(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipoorigem, tipoorigem),
				eq(schema.financeiro.idorigem, idorigem),
			),
		)
		.returning({ id: schema.financeiro.id });

	return removidos.length;
}

interface ListarFinanceiroParametros {
	idempresas: string[];
	page?: number;
	limit?: number;
	saldo?: string | null | undefined;
	emissao?: string | null | undefined;
	documento?: string | null | undefined;
	tipodocumentodescricao?: string | null | undefined;
	emitente?: string | null | undefined;
	historico?: string | null | undefined;
	emissaoInicio?: string | null | undefined;
	emissaoFim?: string | null | undefined;
	vencimentoInicio?: string | null | undefined;
	vencimentoFim?: string | null | undefined;
	status?: string | null | undefined;
	tipo?: "P" | "R" | null | undefined;
	identidade?: string | null | undefined;
	idtipocobranca?: string | null | undefined;
	remessagerada?: number | null | undefined;
	permiteBoleto?: boolean | null | undefined;
	ordenarPor?: OrdenarFinanceirosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
}

export async function listarFinanceiro({
	idempresas,
	page = 1,
	limit = 10,
	saldo,
	emissao,
	documento,
	tipodocumentodescricao,
	emitente,
	historico,
	emissaoInicio,
	emissaoFim,
	vencimentoInicio,
	vencimentoFim,
	status,
	tipo,
	identidade,
	idtipocobranca,
	remessagerada,
	permiteBoleto,
	ordenarPor,
	ordem = "desc",
}: ListarFinanceiroParametros) {
	const offset = (page - 1) * limit;

	const where: SQL[] = [];

	if (saldo) {
		where.push(ilike(schema.financeiro.saldo, saldo));
	}

	if (emissao) {
		where.push(ilike(schema.financeiro.emissao, emissao));
	}

	adicionarFiltroTexto(where, schema.financeiro.documento, documento);
	adicionarFiltroTexto(
		where,
		schema.tipodocumentofinanceiro.descricao,
		tipodocumentodescricao,
	);
	if (emitente?.trim()) {
		const termo = `%${emitente.trim()}%`;
		where.push(
			or(
				ilike(schema.financeiro.emitente, termo),
				ilike(schema.entidade.razaosocial, termo),
				ilike(schema.entidade.nome, termo),
			)!,
		);
	}
	adicionarFiltroTexto(where, schema.financeiro.historico, historico);

	if (emissaoInicio) {
		where.push(gte(schema.financeiro.emissao, emissaoInicio));
	}

	if (emissaoFim) {
		where.push(lte(schema.financeiro.emissao, emissaoFim));
	}

	if (vencimentoInicio) {
		where.push(gte(schema.financeiro.vencimento, vencimentoInicio));
	}

	if (vencimentoFim) {
		where.push(lte(schema.financeiro.vencimento, vencimentoFim));
	}

	if (status) {
		where.push(eq(schema.financeiro.status, status));
	}

	if (tipo) {
		where.push(eq(schema.financeiro.tipo, tipo));
	}

	if (identidade?.trim()) {
		where.push(eq(schema.financeiro.identidade, identidade.trim()));
	}

	if (idtipocobranca?.trim()) {
		where.push(eq(schema.financeiro.idtipocobranca, idtipocobranca.trim()));
	}

	if (remessagerada !== undefined && remessagerada !== null) {
		if (remessagerada === 0) {
			where.push(
				or(
					eq(schema.financeiro.remessagerada, 0),
					isNull(schema.financeiro.remessagerada),
				)!,
			);
		} else {
			where.push(eq(schema.financeiro.remessagerada, remessagerada));
		}
	}

	if (permiteBoleto === true) {
		// Aceita flag explícita ou forma de pagamento NF-e 15 (boleto bancário).
		where.push(
			or(
				eq(schema.tipodocumentofinanceiro.permitegerarboleto, 1),
				eq(schema.tipodocumentofinanceiro.formapagamentonfe, "15"),
			)!,
		);
	}

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "asc"
				? asc(COLUNAS_ORDENACAO[ordenarPor])
				: desc(COLUNAS_ORDENACAO[ordenarPor])
			: desc(schema.financeiro.currenttimemillis);

	const condicao = and(
		inArray(schema.financeiro.idempresa, idempresas),
		...where,
	);

	const joinTipoDocumento = eq(
		schema.financeiro.idtipodocumentofinanceiro,
		schema.tipodocumentofinanceiro.id,
	);
	const joinEntidade = eq(schema.financeiro.identidade, schema.entidade.id);

	const [totalCount, financeiros] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.financeiro)
			.leftJoin(schema.tipodocumentofinanceiro, joinTipoDocumento)
			.leftJoin(schema.entidade, joinEntidade)
			.where(condicao),
		db
			.select({
				...getTableColumns(schema.financeiro),
				tipodocumentodescricao: schema.tipodocumentofinanceiro.descricao,
				nomecliente: sql<string | null>`coalesce(
					nullif(trim(${schema.entidade.razaosocial}), ''),
					nullif(trim(${schema.entidade.nome}), ''),
					nullif(trim(${schema.financeiro.emitente}), '')
				)`,
			})
			.from(schema.financeiro)
			.leftJoin(schema.tipodocumentofinanceiro, joinTipoDocumento)
			.leftJoin(schema.entidade, joinEntidade)
			.where(condicao)
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		financeiros,
		total: totalCount[0]?.value ?? 0,
	};
}
