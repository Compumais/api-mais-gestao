import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { aplicarCreditoIcmsSnItensEmissao } from "@/service/nfe-emissao/aplicar-credito-icms-sn-itens.js";
import type {
	ItemPayloadNfe,
	TotaisPayloadNfe,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { enriquecerItensEmissaoComProduto } from "@/service/nfe-emissao/enriquecer-itens-emissao-produto.js";
import {
	calcularTotaisFiscaisEmissaoNfe,
	type TotaisFiscaisEmissaoNfe,
} from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import { recalcularIcmsStItensEmissao } from "@/util/calcular-icms-st-item-emissao-nfe.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { normalizarGtinItensEmissao } from "@/util/normalizar-gtin-item-emissao-nfe.js";
import { normalizarItensEmissaoNfe } from "@/util/normalizar-tributacao-item-emissao-nfe.js";

export type ResultadoTributacaoItensEmissao = {
	crt: number;
	itens: ItemPayloadNfe[];
	totaisFiscais: TotaisFiscaisEmissaoNfe;
};

/**
 * Pipeline canônico de tributação (mesma ordem da emissão/preview):
 * enrich produto → CST/CSOSN + PIS → GTIN → ICMS ST/FCP ST → crédito SN → totais.
 */
export async function aplicarTributacaoItensEmissaoNfe(params: {
	crt: number;
	itens: ItemPayloadNfe[];
	totais?: TotaisPayloadNfe;
}): Promise<{
	itens: ItemPayloadNfe[];
	totaisFiscais: TotaisFiscaisEmissaoNfe;
	pendencias: string[];
}> {
	const itensEnriquecidos = await enriquecerItensEmissaoComProduto(params.itens);
	const itensTributacao = recalcularIcmsStItensEmissao(
		normalizarGtinItensEmissao(
			normalizarItensEmissaoNfe(params.crt, itensEnriquecidos),
		),
	);
	const { itens, pendencias } =
		await aplicarCreditoIcmsSnItensEmissao(itensTributacao);
	const totaisFiscais = calcularTotaisFiscaisEmissaoNfe(
		params.crt,
		itens,
		params.totais ?? {},
	);

	return { itens, totaisFiscais, pendencias };
}

export async function calcularTributosItensEmissaoNfeService(params: {
	idusuario: string;
	idempresa: string;
	itens: ItemPayloadNfe[];
	totais?: TotaisPayloadNfe;
}): Promise<HttpResponse<ResultadoTributacaoItensEmissao>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!pertence) return httpProibido();

	if (!params.itens?.length) {
		return httpBadRequest("Informe ao menos um item para calcular os tributos");
	}

	const empresaFiscal = await buscarEmpresaFiscalPorEmpresa(params.idempresa);
	if (!empresaFiscal) {
		return httpNaoEncontrado("Cadastro fiscal da empresa não encontrado");
	}

	const crt = empresaFiscal.crt ?? 3;
	const { itens, totaisFiscais, pendencias } =
		await aplicarTributacaoItensEmissaoNfe({
			crt,
			itens: params.itens,
			totais: params.totais,
		});

	if (pendencias.length > 0) {
		return httpBadRequest(pendencias.join("; "));
	}

	return httpOk({
		crt,
		itens,
		totaisFiscais,
	});
}
