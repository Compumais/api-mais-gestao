import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { STATUS_NF_CONFIRMADA } from "@/util/nota-fiscal-constants.js";
import { db } from "./connection";
import {
	movimentoestoque,
	notafiscal,
	notafiscalitem,
	produtos,
} from "./schema.js";

export async function buscarNotaCompraConfirmada(idempresa: string, id: string) {
	const [nota] = await db
		.select({
			id: notafiscal.id,
			numero: notafiscal.numero,
			numeronotafiscal: notafiscal.numeronotafiscal,
			chavenfe: notafiscal.chavenfe,
			status: notafiscal.status,
			tipoorigem: notafiscal.tipoorigem,
			entradasaida: notafiscal.entradasaida,
			idlocalestoque: notafiscal.idlocalestoque,
		})
		.from(notafiscal)
		.where(
			and(
				eq(notafiscal.id, id),
				eq(notafiscal.idempresa, idempresa),
				eq(notafiscal.tipoorigem, 0),
				eq(notafiscal.status, STATUS_NF_CONFIRMADA),
			),
		)
		.limit(1);

	return nota;
}

export async function listarItensCompraConfirmadaAuditoria(params: {
	idempresa: string;
	limit: number;
	idnotafiscal?: string | undefined;
}) {
	const filtros = [
		eq(notafiscal.idempresa, params.idempresa),
		eq(notafiscal.tipoorigem, 0),
		eq(notafiscal.status, STATUS_NF_CONFIRMADA),
		isNotNull(notafiscalitem.idproduto),
		eq(produtos.idempresa, notafiscal.idempresa),
	];
	if (params.idnotafiscal) {
		filtros.push(eq(notafiscal.id, params.idnotafiscal));
	}

	return db
		.select({
			idnotafiscal: notafiscal.id,
			numero: notafiscal.numero,
			numeronotafiscal: notafiscal.numeronotafiscal,
			chavenfe: notafiscal.chavenfe,
			iditem: notafiscalitem.id,
			contador: notafiscalitem.contador,
			descricao: notafiscalitem.descricao,
			idproduto: notafiscalitem.idproduto,
			quantidade: notafiscalitem.quantidade,
			ncmItem: notafiscalitem.ncm,
			idncmItem: notafiscalitem.idncm,
			idcfopItem: notafiscalitem.idcfop,
			cestItem: notafiscalitem.cest,
			situacaotributariaItem: notafiscalitem.situacaotributaria,
			cstpisItem: notafiscalitem.cstpis,
			cstcofinsItem: notafiscalitem.cstcofins,
			cstipiItem: notafiscalitem.situacaotributariaipi,
			dadosimportacao: notafiscalitem.dadosimportacao,
			nomeProduto: produtos.nome,
			ncmProduto: produtos.ncm,
			idncmProduto: produtos.idncm,
			idcestProduto: produtos.idcest,
			cestProduto: produtos.cest,
			idcfopentradaProduto: produtos.idcfopentrada,
			eanProduto: produtos.ean,
			situacaotributariasnentradaProduto: produtos.situacaotributariasnentrada,
			cstpisentradaProduto: produtos.cstpisentrada,
			cstcofinsentradaProduto: produtos.cstcofinsentrada,
			cstipientradaProduto: produtos.cstipientrada,
			idcfopsaidaProduto: produtos.idcfopsaida,
			idcfopsaidanfceProduto: produtos.idcfopsaidanfce,
			situacaotributariaProduto: produtos.situacaotributaria,
			cstpisProduto: produtos.cstpis,
			cstcofinsProduto: produtos.cstcofins,
			quantidadepadrao: produtos.quantidadepadrao,
		})
		.from(notafiscalitem)
		.innerJoin(notafiscal, eq(notafiscalitem.idnotafiscal, notafiscal.id))
		.innerJoin(produtos, eq(notafiscalitem.idproduto, produtos.id))
		.where(and(...filtros))
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
