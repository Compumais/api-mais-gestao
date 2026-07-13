import {
	and,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	isNotNull,
	lte,
	ne,
	or,
	sql,
} from "drizzle-orm";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model";
import type {
	NotaFiscalItem,
	NovoNotaFiscalItem,
} from "@/model/nota-fiscal-item-model";
import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import { notafiscal, notafiscalitem, vendapdvgourmet, cfop, entidade } from "@/repositories/schema.js";
import { STATUS_RASCUNHO_IMPORTACAO, STATUS_NF_CONFIRMADA } from "@/util/nota-fiscal-constants.js";
import { db } from "./connection";

const COLUNAS_ITEM_NF = [
	"id",
	"idnotafiscal",
	"idproduto",
	"descricao",
	"quantidade",
	"precounitario",
	"total",
	"desconto",
	"idcfop",
	"cfop",
	"idncm",
	"ncm",
	"idunidademedida",
	"unidade",
	"situacaotributaria",
	"cstpis",
	"cstcofins",
	"percentualicms",
	"baseicms",
	"icms",
	"aliquotapis",
	"aliquotacofins",
	"pis",
	"cofins",
	"pisretido",
	"cofinsretido",
	"ipi",
	"inss",
	"frete",
	"seguro",
	"outrasdespesas",
	"origem",
	"custoaquisicao",
	"referenciafornecedor",
	"informacaoadicional",
	"contador",
	"tipo",
	"currenttimemillis",
	"dadosimportacao",
] as const;

function montarItemParaInsert(
	item: NovoNotaFiscalItem,
): Record<string, unknown> {
	const dados: Record<string, unknown> = {};

	for (const coluna of COLUNAS_ITEM_NF) {
		if (item[coluna] !== undefined) {
			dados[coluna] = item[coluna];
		}
	}

	return dados;
}

export async function criarNotaFiscalComItens(
	notaFiscal: NovaNotaFiscal,
	itens: NovoNotaFiscalItem[],
) {
	return db.transaction(async (tx) => {
		const [notaCriada] = await tx
			.insert(notafiscal)
			.values(notaFiscal)
			.returning();

		if (!notaCriada) {
			return { notaFiscal: null, itens: [] };
		}

		const itensCriados: NotaFiscalItem[] = [];

		for (const item of itens) {
			const [itemCriado] = await tx
				.insert(notafiscalitem)
				.values(montarItemParaInsert(item) as NovoNotaFiscalItem)
				.returning();

			if (itemCriado) {
				itensCriados.push(itemCriado);
			}
		}

		return { notaFiscal: notaCriada, itens: itensCriados };
	});
}

export async function buscarNotaFiscalPorId(id: string) {
	const [registro] = await db
		.select()
		.from(notafiscal)
		.where(eq(notafiscal.id, id))
		.limit(1);

	return registro;
}

export async function listarItensPorNotaFiscal(idnotafiscal: string) {
	return db
		.select()
		.from(notafiscalitem)
		.where(eq(notafiscalitem.idnotafiscal, idnotafiscal))
		.orderBy(notafiscalitem.contador);
}

export type ListarNotasFiscaisPorEmpresaParametros = {
	idempresa: string;
	numero?: string | undefined;
	identidade?: string | undefined;
	status?: number | undefined;
	tipoorigem?: number | undefined;
	idcfop?: string | undefined;
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	excluirRascunhos?: boolean | undefined;
	somenteRascunhos?: boolean | undefined;
	page?: number;
	limit?: number;
};

export async function listarNotasFiscaisPorEmpresa({
	idempresa,
	numero,
	identidade,
	status,
	tipoorigem,
	idcfop,
	dataInicio,
	dataFim,
	excluirRascunhos = false,
	somenteRascunhos = false,
	page = 1,
	limit = 10,
}: ListarNotasFiscaisPorEmpresaParametros) {
	const where = [eq(notafiscal.idempresa, idempresa)];

	if (somenteRascunhos) {
		where.push(eq(notafiscal.status, STATUS_RASCUNHO_IMPORTACAO));
	} else if (excluirRascunhos) {
		where.push(ne(notafiscal.status, STATUS_RASCUNHO_IMPORTACAO));
	}

	if (numero) {
		where.push(ilike(notafiscal.numero, `%${numero}%`));
	}

	if (identidade) {
		where.push(eq(notafiscal.identidade, identidade));
	}

	if (status !== undefined) {
		where.push(eq(notafiscal.status, status));
	}

	if (tipoorigem !== undefined) {
		where.push(eq(notafiscal.tipoorigem, tipoorigem));
	}

	if (idcfop) {
		where.push(eq(notafiscal.idcfop, idcfop));
	}

	if (dataInicio) {
		where.push(gte(notafiscal.emissao, dataInicio));
	}

	if (dataFim) {
		where.push(lte(notafiscal.emissao, dataFim));
	}

	const offset = (page - 1) * limit;

	const [totalCount, notas] = await Promise.all([
		db
			.select({ value: count() })
			.from(notafiscal)
			.where(and(...where)),
		db
			.select()
			.from(notafiscal)
			.where(and(...where))
			.orderBy(desc(notafiscal.datainclusao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		notas,
		total: totalCount[0]?.value ?? 0,
	};
}

export type ListarNfcePorEmpresaParametros = {
	idempresa: string;
	status?: number | undefined;
	page?: number;
	limit?: number;
};

export type NfceListagem = {
	idnotafiscal: string;
	idvenda: string | null;
	numeronotafiscal: string | null;
	serie: string | null;
	chavenfe: string | null;
	protocolonfe: string | null;
	status: number | null;
	valortotalnota: string | null;
	emissao: string | null;
	datahoraemissao: string | null;
	datainclusao: string | null;
	tipoambientenfe: number | null;
	mensagemtransmissaonfe: string | null;
	codigostatusprotocolonfe: number | null;
};

export type ListarNfcePendentesParametros = ListarNfcePorEmpresaParametros;

export type NfcePendenteListagem = NfceListagem;

export async function listarNfcePorEmpresa({
	idempresa,
	status,
	page = 1,
	limit = 20,
}: ListarNfcePorEmpresaParametros) {
	const where = [
		eq(notafiscal.idempresa, idempresa),
		eq(notafiscal.modelo, "65"),
		ne(notafiscal.status, STATUS_RASCUNHO_IMPORTACAO),
	];

	if (status !== undefined) {
		where.push(eq(notafiscal.status, status));
	}

	const offset = (page - 1) * limit;

	const [totalCount, registros] = await Promise.all([
		db
			.select({ value: count() })
			.from(notafiscal)
			.where(and(...where)),
		db
			.select({
				idnotafiscal: notafiscal.id,
				idvenda: vendapdvgourmet.id,
				numeronotafiscal: notafiscal.numeronotafiscal,
				serie: notafiscal.serie,
				chavenfe: notafiscal.chavenfe,
				protocolonfe: notafiscal.protocolonfe,
				status: notafiscal.status,
				valortotalnota: notafiscal.valortotalnota,
				emissao: notafiscal.emissao,
				datahoraemissao: notafiscal.datahoraemissao,
				datainclusao: notafiscal.datainclusao,
				tipoambientenfe: notafiscal.tipoambientenfe,
				mensagemtransmissaonfe: notafiscal.mensagemtransmissaonfe,
				codigostatusprotocolonfe: notafiscal.codigostatusprotocolonfe,
			})
			.from(notafiscal)
			.leftJoin(
				vendapdvgourmet,
				eq(vendapdvgourmet.idnotafiscalnfce, notafiscal.id),
			)
			.where(and(...where))
			.orderBy(desc(notafiscal.datainclusao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		notas: registros as NfceListagem[],
		total: totalCount[0]?.value ?? 0,
	};
}

export async function atualizarNotaFiscal(
	id: string,
	dados: Partial<NovaNotaFiscal>,
) {
	const [registro] = await db
		.update(notafiscal)
		.set(dados)
		.where(eq(notafiscal.id, id))
		.returning();

	return registro;
}

export async function substituirItensNotaFiscal(
	idnotafiscal: string,
	itens: NovoNotaFiscalItem[],
) {
	return db.transaction(async (tx) => {
		await tx
			.delete(notafiscalitem)
			.where(eq(notafiscalitem.idnotafiscal, idnotafiscal));

		const itensCriados: NotaFiscalItem[] = [];

		for (const item of itens) {
			const [itemCriado] = await tx
				.insert(notafiscalitem)
				.values(montarItemParaInsert(item) as NovoNotaFiscalItem)
				.returning();

			if (itemCriado) {
				itensCriados.push(itemCriado);
			}
		}

		return itensCriados;
	});
}

export async function excluirNotaFiscal(id: string) {
	const [registro] = await db
		.delete(notafiscal)
		.where(eq(notafiscal.id, id))
		.returning();

	return registro;
}

export async function buscarNotaFiscalRascunhoPorId(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(notafiscal)
		.where(
			and(
				eq(notafiscal.id, id),
				eq(notafiscal.idempresa, idempresa),
				eq(notafiscal.status, STATUS_RASCUNHO_IMPORTACAO),
			),
		)
		.limit(1);

	return registro;
}

export async function buscarNotaFiscalPorChaveNfe(
	idempresa: string,
	chavenfe: string,
	excluirId?: string | undefined,
) {
	const where = [
		eq(notafiscal.idempresa, idempresa),
		eq(notafiscal.chavenfe, chavenfe),
	];

	if (excluirId) {
		where.push(ne(notafiscal.id, excluirId));
	}

	const [registro] = await db
		.select()
		.from(notafiscal)
		.where(and(...where))
		.limit(1);

	return registro;
}

export async function buscarNotasFiscaisPorChavesNfe(
	idempresa: string,
	chaves: string[],
): Promise<Map<string, { id: string; status: number }>> {
	if (chaves.length === 0) {
		return new Map();
	}

	const registros = await db
		.select({
			id: notafiscal.id,
			chavenfe: notafiscal.chavenfe,
			status: notafiscal.status,
		})
		.from(notafiscal)
		.where(
			and(
				eq(notafiscal.idempresa, idempresa),
				inArray(notafiscal.chavenfe, chaves),
				ne(notafiscal.status, STATUS_RASCUNHO_IMPORTACAO),
			),
		);

	const mapa = new Map<string, { id: string; status: number }>();
	for (const registro of registros) {
		if (registro.chavenfe && registro.status !== null) {
			mapa.set(registro.chavenfe, {
				id: registro.id,
				status: registro.status,
			});
		}
	}

	return mapa;
}

export async function buscarItemNotaFiscalPorId(
	id: string,
	idnotafiscal: string,
) {
	const [registro] = await db
		.select()
		.from(notafiscalitem)
		.where(
			and(
				eq(notafiscalitem.id, id),
				eq(notafiscalitem.idnotafiscal, idnotafiscal),
			),
		)
		.limit(1);

	return registro;
}

export async function atualizarItemNotaFiscal(
	id: string,
	dados: Partial<NovoNotaFiscalItem> & {
		dadosimportacao?: DadosImportacaoItem | null | undefined;
	},
) {
	const [registro] = await db
		.update(notafiscalitem)
		.set(dados)
		.where(eq(notafiscalitem.id, id))
		.returning();

	return registro;
}

export async function finalizarRascunhoNotaFiscal(
	id: string,
	dadosNota: Partial<NovaNotaFiscal>,
	itens: Array<Partial<NovoNotaFiscalItem> & { id: string }>,
) {
	return db.transaction(async (tx) => {
		const [notaAtualizada] = await tx
			.update(notafiscal)
			.set(dadosNota)
			.where(eq(notafiscal.id, id))
			.returning();

		if (!notaAtualizada) {
			return { notaFiscal: null, itens: [] as NotaFiscalItem[] };
		}

		const itensAtualizados: NotaFiscalItem[] = [];

		for (const item of itens) {
			const { id: idItem, ...dadosItem } = item;
			const [itemAtualizado] = await tx
				.update(notafiscalitem)
				.set(dadosItem)
				.where(eq(notafiscalitem.id, idItem))
				.returning();

			if (itemAtualizado) {
				itensAtualizados.push(itemAtualizado);
			}
		}

		return { notaFiscal: notaAtualizada, itens: itensAtualizados };
	});
}

export async function contarNotasFiscaisPorSerie(idserie: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(notafiscal)
		.where(eq(notafiscal.idserie, idserie));

	return resultado?.value ?? 0;
}

export type ListarNotasParaExportacaoXmlContabilidadeParametros = {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
};

export type NotaFiscalExportacaoXml = {
	id: string;
	modelo: string | null;
	chavenfe: string | null;
	emissao: string | null;
};

const STATUS_NFE_AUTORIZADA = 100;

export async function listarNotasParaExportacaoXmlContabilidade({
	idempresa,
	dataInicio,
	dataFim,
}: ListarNotasParaExportacaoXmlContabilidadeParametros): Promise<
	NotaFiscalExportacaoXml[]
> {
	return db
		.select({
			id: notafiscal.id,
			modelo: notafiscal.modelo,
			chavenfe: notafiscal.chavenfe,
			emissao: notafiscal.emissao,
		})
		.from(notafiscal)
		.where(
			and(
				eq(notafiscal.idempresa, idempresa),
				eq(notafiscal.status, STATUS_NFE_AUTORIZADA),
				gte(notafiscal.emissao, dataInicio),
				lte(notafiscal.emissao, dataFim),
				isNotNull(notafiscal.chavenfe),
				or(
					and(eq(notafiscal.modelo, "55"), eq(notafiscal.tipoorigem, 1)),
					eq(notafiscal.modelo, "65"),
				),
			),
		)
		.orderBy(desc(notafiscal.emissao));
}

export type RelatorioFiscalNotaItem = {
	id: string;
	emissao: string | null;
	numero: string | null;
	numeronotafiscal: string | null;
	chavenfe: string | null;
	modelo: string | null;
	tipoorigem: number | null;
	valortotalnota: string | null;
	baseicms: string | null;
	icms: string | null;
	pis: string | null;
	cofins: string | null;
	status: number | null;
	parceiroNome: string | null;
	cfopCodigo: string | null;
	cfopDescricao: string | null;
};

export type ListarNotasRelatorioFiscalParametros = {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
};

const COLUNAS_RELATORIO_FISCAL = {
	id: notafiscal.id,
	emissao: notafiscal.emissao,
	numero: notafiscal.numero,
	numeronotafiscal: notafiscal.numeronotafiscal,
	chavenfe: notafiscal.chavenfe,
	modelo: notafiscal.modelo,
	tipoorigem: notafiscal.tipoorigem,
	valortotalnota: notafiscal.valortotalnota,
	baseicms: notafiscal.baseicms,
	icms: notafiscal.icms,
	pis: notafiscal.pis,
	cofins: notafiscal.cofins,
	status: notafiscal.status,
	parceiroNome: sql<string | null>`coalesce(${entidade.razaosocial}, ${entidade.nome})`,
	cfopCodigo: cfop.codigo,
	cfopDescricao: cfop.descricao,
};

function filtrosPeriodoRelatorio(
	idempresa: string,
	dataInicio: string,
	dataFim: string,
) {
	return [
		eq(notafiscal.idempresa, idempresa),
		gte(notafiscal.emissao, dataInicio),
		lte(notafiscal.emissao, dataFim),
		ne(notafiscal.status, STATUS_RASCUNHO_IMPORTACAO),
	];
}

export async function listarNotasRelatorioFiscalCompras({
	idempresa,
	dataInicio,
	dataFim,
}: ListarNotasRelatorioFiscalParametros): Promise<RelatorioFiscalNotaItem[]> {
	return db
		.select(COLUNAS_RELATORIO_FISCAL)
		.from(notafiscal)
		.leftJoin(entidade, eq(notafiscal.identidade, entidade.id))
		.leftJoin(cfop, eq(notafiscal.idcfop, cfop.id))
		.where(
			and(
				...filtrosPeriodoRelatorio(idempresa, dataInicio, dataFim),
				eq(notafiscal.tipoorigem, 0),
				eq(notafiscal.status, STATUS_NF_CONFIRMADA),
			),
		)
		.orderBy(desc(notafiscal.emissao));
}

export async function listarNotasRelatorioFiscalVendas({
	idempresa,
	dataInicio,
	dataFim,
}: ListarNotasRelatorioFiscalParametros): Promise<RelatorioFiscalNotaItem[]> {
	return db
		.select(COLUNAS_RELATORIO_FISCAL)
		.from(notafiscal)
		.leftJoin(entidade, eq(notafiscal.identidade, entidade.id))
		.leftJoin(cfop, eq(notafiscal.idcfop, cfop.id))
		.where(
			and(
				...filtrosPeriodoRelatorio(idempresa, dataInicio, dataFim),
				eq(notafiscal.status, STATUS_NFE_AUTORIZADA),
				isNotNull(notafiscal.chavenfe),
				or(eq(notafiscal.tipoorigem, 1), eq(notafiscal.modelo, "65")),
			),
		)
		.orderBy(desc(notafiscal.emissao));
}

export async function listarNotasRelatorioFiscalContabilidade({
	idempresa,
	dataInicio,
	dataFim,
}: ListarNotasRelatorioFiscalParametros): Promise<RelatorioFiscalNotaItem[]> {
	return db
		.select(COLUNAS_RELATORIO_FISCAL)
		.from(notafiscal)
		.leftJoin(entidade, eq(notafiscal.identidade, entidade.id))
		.leftJoin(cfop, eq(notafiscal.idcfop, cfop.id))
		.where(
			and(
				...filtrosPeriodoRelatorio(idempresa, dataInicio, dataFim),
				or(
					and(
						eq(notafiscal.tipoorigem, 0),
						eq(notafiscal.status, STATUS_NF_CONFIRMADA),
					),
					and(
						eq(notafiscal.status, STATUS_NFE_AUTORIZADA),
						isNotNull(notafiscal.chavenfe),
						or(
							and(
								eq(notafiscal.modelo, "55"),
								eq(notafiscal.tipoorigem, 1),
							),
							eq(notafiscal.modelo, "65"),
						),
					),
				),
			),
		)
		.orderBy(desc(notafiscal.emissao));
}

const STATUS_NOTA_PENDENTE_CORRECAO = [90, 110, 301] as const;

export type ContarNfcePendentesPeriodoParametros = {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
};

export type ContarNotasPendentesCorrecaoParametros = {
	idempresa: string;
	incluirNfe?: boolean;
	incluirNfce?: boolean;
	dataInicio?: string;
	dataFim?: string;
};

export type ContagemNotasPendentesCorrecao = {
	nfe: number;
	nfce: number;
	total: number;
};

/** NF-e (55) e/ou NFC-e (65) pendente/rejeitada/denegada. */
export async function contarNotasFiscaisPendentesCorrecao({
	idempresa,
	incluirNfe = true,
	incluirNfce = true,
	dataInicio,
	dataFim,
}: ContarNotasPendentesCorrecaoParametros): Promise<ContagemNotasPendentesCorrecao> {
	const modelos: string[] = [];
	if (incluirNfe) modelos.push("55");
	if (incluirNfce) modelos.push("65");

	if (modelos.length === 0) {
		return { nfe: 0, nfce: 0, total: 0 };
	}

	const condicoes = [
		eq(notafiscal.idempresa, idempresa),
		inArray(notafiscal.modelo, modelos),
		inArray(notafiscal.status, [...STATUS_NOTA_PENDENTE_CORRECAO]),
	];

	if (dataInicio) {
		condicoes.push(gte(notafiscal.emissao, dataInicio));
	}
	if (dataFim) {
		condicoes.push(lte(notafiscal.emissao, dataFim));
	}

	const linhas = await db
		.select({
			modelo: notafiscal.modelo,
			value: count(),
		})
		.from(notafiscal)
		.where(and(...condicoes))
		.groupBy(notafiscal.modelo);

	let nfe = 0;
	let nfce = 0;
	for (const linha of linhas) {
		if (linha.modelo === "55") nfe = linha.value;
		if (linha.modelo === "65") nfce = linha.value;
	}

	return { nfe, nfce, total: nfe + nfce };
}

/** NFC-e (modelo 65) pendente/rejeitada/denegada no período de emissão. */
export async function contarNfcePendentesNoPeriodo({
	idempresa,
	dataInicio,
	dataFim,
}: ContarNfcePendentesPeriodoParametros): Promise<number> {
	const resultado = await contarNotasFiscaisPendentesCorrecao({
		idempresa,
		incluirNfe: false,
		incluirNfce: true,
		dataInicio,
		dataFim,
	});
	return resultado.nfce;
}
