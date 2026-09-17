import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type {
	FiltrosRelatorioNotasFiscais,
	StatusRelatorioNotasFiscais,
} from "@/model/relatorio-notas-fiscais-model.js";
import { entidade, notafiscal } from "@/repositories/schema.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { db } from "./connection.js";

const STATUS_EXIBIDOS = [
	NFE_STATUS.PENDENTE,
	NFE_STATUS.AUTORIZADA,
	NFE_STATUS.CANCELADA,
	NFE_STATUS.INUTILIZADA,
	NFE_STATUS.REJEITADA,
	NFE_STATUS.CANCELADA_FORA_PRAZO,
	NFE_STATUS.DENEGADA,
] as const;

export function statusParaFiltroRelatorio(
	status: StatusRelatorioNotasFiscais,
): number[] {
	switch (status) {
		case "pendente":
			return [NFE_STATUS.PENDENTE, NFE_STATUS.REJEITADA, NFE_STATUS.DENEGADA];
		case "autorizada":
			return [NFE_STATUS.AUTORIZADA];
		case "cancelada":
			return [NFE_STATUS.CANCELADA, NFE_STATUS.CANCELADA_FORA_PRAZO];
		case "inutilizada":
			return [NFE_STATUS.INUTILIZADA];
		default:
			return [...STATUS_EXIBIDOS];
	}
}

const DATA_REFERENCIA = sql<string | null>`case
	when ${notafiscal.status} = ${NFE_STATUS.INUTILIZADA}
		then coalesce(${notafiscal.dataalteracao}, ${notafiscal.datahoraemissao}, ${notafiscal.emissao}::timestamp, ${notafiscal.datainclusao})
	when ${notafiscal.status} in (${NFE_STATUS.CANCELADA}, ${NFE_STATUS.CANCELADA_FORA_PRAZO})
		then coalesce(${notafiscal.cancelamento}, ${notafiscal.dataalteracao}, ${notafiscal.datahoraemissao}, ${notafiscal.emissao}::timestamp)
	else coalesce(${notafiscal.datahoraemissao}, ${notafiscal.emissao}::timestamp, ${notafiscal.datainclusao})
end`;

function montarFiltros(filtros: FiltrosRelatorioNotasFiscais): SQL[] {
	const condicoes: SQL[] = [
		eq(notafiscal.idempresa, filtros.idempresa),
		inArray(notafiscal.status, statusParaFiltroRelatorio(filtros.status)),
		gte(sql`${DATA_REFERENCIA}::date`, filtros.dataInicio),
		lte(sql`${DATA_REFERENCIA}::date`, filtros.dataFim),
	];
	const filtroOrigem = or(
		and(eq(notafiscal.modelo, "55"), eq(notafiscal.tipoorigem, 1)),
		eq(notafiscal.modelo, "65"),
	);
	if (filtroOrigem) condicoes.push(filtroOrigem);

	if (filtros.ambiente !== "todos") {
		condicoes.push(eq(notafiscal.tipoambientenfe, Number(filtros.ambiente)));
	}
	if (filtros.modelo !== "todos") {
		condicoes.push(eq(notafiscal.modelo, filtros.modelo));
	}
	if (filtros.serie) {
		condicoes.push(eq(notafiscal.serie, filtros.serie));
	}
	if (filtros.numeroChave) {
		const termo = `%${filtros.numeroChave}%`;
		const filtroNumeroChave = or(
			ilike(notafiscal.numero, termo),
			ilike(notafiscal.numeronotafiscal, termo),
			ilike(notafiscal.chavenfe, termo),
			ilike(notafiscal.protocolonfe, termo),
		);
		if (filtroNumeroChave) condicoes.push(filtroNumeroChave);
	}
	if (filtros.destinatario) {
		const termo = `%${filtros.destinatario}%`;
		const filtroDestinatario = or(
			ilike(notafiscal.razaosocial, termo),
			ilike(entidade.razaosocial, termo),
			ilike(entidade.nome, termo),
		);
		if (filtroDestinatario) condicoes.push(filtroDestinatario);
	}

	return condicoes;
}

export type RegistroRelatorioNotaFiscal = {
	id: string;
	dataHora: string | null;
	modelo: string | null;
	serie: string | null;
	numero: string | null;
	chave: string | null;
	protocolo: string | null;
	destinatario: string | null;
	valorTotal: string | null;
	status: number | null;
	ambiente: number | null;
};

export type AgrupamentoRelatorioNotaFiscal = {
	status: number | null;
	ambiente: number | null;
	quantidade: number;
};

const COLUNAS = {
	id: notafiscal.id,
	dataHora: DATA_REFERENCIA,
	modelo: notafiscal.modelo,
	serie: notafiscal.serie,
	numero: sql<
		string | null
	>`coalesce(nullif(${notafiscal.numeronotafiscal}, ''), nullif(${notafiscal.numero}, ''))`,
	chave: notafiscal.chavenfe,
	protocolo: notafiscal.protocolonfe,
	destinatario: sql<
		string | null
	>`coalesce(nullif(${notafiscal.razaosocial}, ''), nullif(${entidade.razaosocial}, ''), nullif(${entidade.nome}, ''))`,
	valorTotal: notafiscal.valortotalnota,
	status: notafiscal.status,
	ambiente: notafiscal.tipoambientenfe,
};

export async function consultarRelatorioNotasFiscais(
	filtros: FiltrosRelatorioNotasFiscais,
): Promise<{
	registros: RegistroRelatorioNotaFiscal[];
	total: number;
	agrupamentos: AgrupamentoRelatorioNotaFiscal[];
}> {
	const condicoes = montarFiltros(filtros);
	const where = and(...condicoes);
	const offset = (filtros.page - 1) * filtros.limit;

	const [registros, totalLinhas, agrupamentos] = await Promise.all([
		db
			.select(COLUNAS)
			.from(notafiscal)
			.leftJoin(entidade, eq(notafiscal.identidade, entidade.id))
			.where(where)
			.orderBy(desc(DATA_REFERENCIA), desc(notafiscal.id))
			.limit(filtros.limit)
			.offset(offset),
		db
			.select({ quantidade: count() })
			.from(notafiscal)
			.leftJoin(entidade, eq(notafiscal.identidade, entidade.id))
			.where(where),
		db
			.select({
				status: notafiscal.status,
				ambiente: notafiscal.tipoambientenfe,
				quantidade: count(),
			})
			.from(notafiscal)
			.leftJoin(entidade, eq(notafiscal.identidade, entidade.id))
			.where(where)
			.groupBy(notafiscal.status, notafiscal.tipoambientenfe),
	]);

	return {
		registros,
		total: Number(totalLinhas[0]?.quantidade ?? 0),
		agrupamentos: agrupamentos.map((item) => ({
			...item,
			quantidade: Number(item.quantidade),
		})),
	};
}
