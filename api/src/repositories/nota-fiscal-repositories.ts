import { and, count, desc, eq, gte, ilike, lte, ne } from "drizzle-orm";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model";
import type {
	NotaFiscalItem,
	NovoNotaFiscalItem,
} from "@/model/nota-fiscal-item-model";
import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import { notafiscal, notafiscalitem } from "@/repositories/schema.js";
import { STATUS_RASCUNHO_IMPORTACAO } from "@/util/nota-fiscal-constants.js";
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
