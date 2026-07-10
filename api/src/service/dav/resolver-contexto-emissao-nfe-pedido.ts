import type { HttpResponse } from "@/model/http-model.js";
import { buscarDavPorId } from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { montarItensEmissaoDav } from "@/service/dav/montar-itens-emissao-dav.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type ResolverContextoEmissaoNfePedidoParametros = {
	idusuario: string;
	iddav: string;
	idempresa: string;
};

export type ContextoEmissaoNfePedido = {
	iddav: string;
	pendencias: string[];
	iddestinatario?: string;
	idtipodocumento?: string;
	idcondicaopagto?: string;
	idlocalestoque?: string;
	formaPagamentoNfe?: string;
	informacoesAdicionais?: string;
	totais?: {
		desconto?: number;
	};
	itens: ItemPayloadNfe[];
	gerarFinanceiro: boolean;
	gerarEstoque: boolean;
};

export async function resolverContextoEmissaoNfePedidoService({
	idusuario,
	iddav,
	idempresa,
}: ResolverContextoEmissaoNfePedidoParametros): Promise<
	HttpResponse<ContextoEmissaoNfePedido>
> {
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

	let formaPagamentoNfe: string | undefined;
	if (dav.idtipodocumentofinanceiro) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			dav.idtipodocumentofinanceiro,
		);
		formaPagamentoNfe = tipoDoc?.formapagamentonfe?.trim() || undefined;
	}

	const desconto = parseFloat(dav.descontosubtotal ?? dav.desconto ?? "0");

	const identificadorDav =
		dav.codigo != null ? String(dav.codigo) : dav.id.slice(0, 8);
	const partesInfo: string[] = [];
	if (dav.observacao?.trim()) {
		partesInfo.push(dav.observacao.trim());
	}
	partesInfo.push(`DAV(s): ${identificadorDav}`);
	const informacoesAdicionais = partesInfo.join("\n").trim();

	return httpOk<ContextoEmissaoNfePedido>({
		iddav,
		pendencias,
		iddestinatario: dav.idcliente,
		...(dav.idtipodocumentofinanceiro
			? { idtipodocumento: dav.idtipodocumentofinanceiro }
			: {}),
		...(dav.idcondicaopagamento
			? { idcondicaopagto: dav.idcondicaopagamento }
			: {}),
		...(dav.idlocalestoque ? { idlocalestoque: dav.idlocalestoque } : {}),
		...(formaPagamentoNfe ? { formaPagamentoNfe } : {}),
		informacoesAdicionais,
		...(desconto > 0 ? { totais: { desconto } } : {}),
		itens,
		gerarFinanceiro: true,
		gerarEstoque: true,
	});
}
