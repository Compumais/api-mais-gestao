import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { STATUS_NF_CONFIRMADA } from "@/util/nota-fiscal-constants.js";
import { db } from "./connection";
import {
	movimentoestoque,
	notafiscal,
	notafiscalitem,
	produtos,
} from "./schema.js";

export async function listarItensCompraConfirmadaAuditoria(params: {
	idempresa: string;
	limit: number;
}) {
	return db
		.select({
			idnotafiscal: notafiscal.id,
			numero: notafiscal.numero,
			numeronotafiscal: notafiscal.numeronotafiscal,
			chavenfe: notafiscal.chavenfe,
			iditem: notafiscalitem.id,
			idproduto: notafiscalitem.idproduto,
			quantidade: notafiscalitem.quantidade,
			ncmItem: notafiscalitem.ncm,
			idncmItem: notafiscalitem.idncm,
			idcfopItem: notafiscalitem.idcfop,
			dadosimportacao: notafiscalitem.dadosimportacao,
			ncmProduto: produtos.ncm,
			idncmProduto: produtos.idncm,
			idcestProduto: produtos.idcest,
			idcfopentradaProduto: produtos.idcfopentrada,
			eanProduto: produtos.ean,
			quantidadepadrao: produtos.quantidadepadrao,
		})
		.from(notafiscalitem)
		.innerJoin(notafiscal, eq(notafiscalitem.idnotafiscal, notafiscal.id))
		.innerJoin(produtos, eq(notafiscalitem.idproduto, produtos.id))
		.where(
			and(
				eq(notafiscal.idempresa, params.idempresa),
				eq(notafiscal.tipoorigem, 0),
				eq(notafiscal.status, STATUS_NF_CONFIRMADA),
				isNotNull(notafiscalitem.idproduto),
			),
		)
		.orderBy(desc(notafiscal.entradasaida), desc(notafiscal.datainclusao))
		.limit(params.limit);
}

export async function listarMovimentosPorNotas(idsNotas: string[]) {
	if (idsNotas.length === 0) return [];

	return db
		.select({
			idoriginal: movimentoestoque.idoriginal,
			iditemoriginal: movimentoestoque.iditemoriginal,
			quantidadeentrada: movimentoestoque.quantidadeentrada,
			cancelado: movimentoestoque.cancelado,
		})
		.from(movimentoestoque)
		.where(inArray(movimentoestoque.idoriginal, idsNotas));
}
