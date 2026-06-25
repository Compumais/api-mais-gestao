import type { HttpResponse } from "@/model/http-model.js";
import { atualizarDav, buscarDavPorId } from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	emitirNfeVendaService,
	type ResultadoEmissaoNfeVenda,
} from "@/service/nfe-emissao/emitir-nfe-venda.js";
import type { FormaPagamentoNfVenda } from "@/service/nota-fiscal/gerar-contas-receber-nf.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { montarItensEmissaoDav } from "@/service/dav/montar-itens-emissao-dav.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

type FaturarDavNfeParametros = {
	idusuario: string;
	iddav: string;
	idempresa: string;
	idserienfe?: string | undefined;
	confirmarProducao?: boolean | undefined;
	gerarFinanceiro?: boolean | undefined;
	gerarEstoque?: boolean | undefined;
};

function montarFormasPagamentoDav(
	dav: Awaited<ReturnType<typeof buscarDavPorId>>,
	valorTotal: number,
): FormaPagamentoNfVenda[] | undefined {
	if (!dav?.idtipodocumentofinanceiro) {
		return undefined;
	}

	const avista = parseFloat(dav.avista ?? dav.dinheiro ?? "0");
	const aprazo = parseFloat(dav.aprazo ?? "0");

	if (avista > 0 && aprazo > 0) {
		return [
			{
				idtipodocumentofinanceiro: dav.idtipodocumentofinanceiro,
				valor: avista,
				indPag: 0,
			},
			{
				idtipodocumentofinanceiro: dav.idtipodocumentofinanceiro,
				valor: aprazo,
				indPag: 1,
			},
		];
	}

	return [
		{
			idtipodocumentofinanceiro: dav.idtipodocumentofinanceiro,
			valor: valorTotal,
			indPag: aprazo > 0 ? 1 : 0,
		},
	];
}

export async function faturarDavNfeService({
	idusuario,
	iddav,
	idempresa,
	idserienfe,
	confirmarProducao = false,
	gerarFinanceiro = true,
	gerarEstoque = true,
}: FaturarDavNfeParametros): Promise<HttpResponse<ResultadoEmissaoNfeVenda>> {
	const dav = await buscarDavPorId(iddav);

	if (!dav) {
		return httpNaoEncontrado();
	}

	if (dav.idempresa !== idempresa) {
		return httpProibido();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (dav.idnotafiscal) {
		return httpBadRequest("Pedido já faturado com NF-e");
	}

	if (!dav.idcliente) {
		return httpBadRequest("Pedido sem cliente vinculado");
	}

	const { itens, pendencias } = await montarItensEmissaoDav(idempresa, iddav);

	if (pendencias.length > 0) {
		return httpBadRequest(pendencias.join("; "));
	}

	if (itens.length === 0) {
		return httpBadRequest("Pedido sem itens válidos para faturamento");
	}

	const valorTotalItens = itens.reduce(
		(acc, item) => acc + item.quantidade * item.valorUnitario,
		0,
	);
	const desconto = parseFloat(dav.descontosubtotal ?? dav.desconto ?? "0");

	let pagamento: { formas: Array<{ tPag: string; vPag: number; indPag?: number }> } | undefined;

	if (dav.idtipodocumentofinanceiro) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			dav.idtipodocumentofinanceiro,
		);
		if (tipoDoc?.formapagamentonfe) {
			pagamento = {
				formas: [
					{
						tPag: tipoDoc.formapagamentonfe,
						vPag: Math.max(valorTotalItens - desconto, 0.01),
						indPag: tipoDoc.aprazo === 1 ? 1 : 0,
					},
				],
			};
		}
	}

	const formasPagamento = montarFormasPagamentoDav(
		dav,
		Math.max(valorTotalItens - desconto, 0),
	);

	const resultado = await emitirNfeVendaService({
		idusuario,
		idempresa,
		iddestinatario: dav.idcliente,
		...(idserienfe ? { idserienfe } : {}),
		confirmarProducao,
		itens,
		...(desconto > 0 ? { totais: { desconto } } : {}),
		...(pagamento ? { pagamento } : {}),
		...(dav.idcondicaopagamento ? { idcondicaopagto: dav.idcondicaopagamento } : {}),
		...(dav.idlocalestoque ? { idlocalestoque: dav.idlocalestoque } : {}),
		...(dav.idtipodocumentofinanceiro
			? { idtipodocumento: dav.idtipodocumentofinanceiro }
			: {}),
		iddav,
		...(formasPagamento ? { formasPagamento } : {}),
		gerarFinanceiro,
		gerarEstoque,
	});

	if (!resultado.success || !resultado.body?.idnotafiscal) {
		return resultado;
	}

	const agora = new Date().toISOString();

	await atualizarDav(iddav, {
		idnotafiscal: resultado.body.idnotafiscal,
		datahorafaturamento: agora,
		idusuariofaturamento: idusuario,
	});

	return resultado;
}
