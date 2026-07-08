import { previewDanfeNfeGateway } from "@/lib/nfe-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	type PayloadEmissaoNfeVendaPreparado,
	type PrepararPayloadEmissaoNfeVendaParams,
	prepararPayloadEmissaoNfeVenda,
} from "@/service/nfe-emissao/preparar-payload-emissao-nfe-venda.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";

export type PreviewDanfeNfeVendaParametros =
	PrepararPayloadEmissaoNfeVendaParams;

export type ResultadoPreviewDanfeNfeVenda = {
	pdf: Buffer;
	filename: string;
	pendencias?: Array<{ codigo: string; mensagem: string }>;
};

export async function previewDanfeNfeVendaService(
	params: PreviewDanfeNfeVendaParametros,
): Promise<HttpResponse<ResultadoPreviewDanfeNfeVenda>> {
	const preparado = await prepararPayloadEmissaoNfeVenda(params, {
		modo: "preview",
	});

	if (!preparado.success) {
		return {
			success: false,
			status: preparado.status,
			error: preparado.error,
			code: preparado.code,
		};
	}

	if (!preparado.body) {
		return httpBadRequest("Falha ao preparar pré-visualização");
	}

	if ("idnotafiscal" in preparado.body && preparado.body.idnotafiscal === "") {
		return httpBadRequest(
			preparado.body.pendencias.map((p) => p.mensagem).join("; ") ||
				"Pré-requisitos de emissão incompletos",
		);
	}

	const prep = preparado.body as PayloadEmissaoNfeVendaPreparado;
	const respostaGateway = await previewDanfeNfeGateway(prep.payloadGateway);

	if (!respostaGateway.sucesso || !respostaGateway.pdfBase64) {
		return httpBadRequest(
			respostaGateway.erro ?? "Falha ao gerar pré-visualização do DANFE",
		);
	}

	const numero = prep.numeracao.numeroNf;
	const serie = prep.numeracao.serie;

	return httpOk({
		pdf: Buffer.from(respostaGateway.pdfBase64, "base64"),
		filename: `preview-danfe-serie${serie}-n${numero}.pdf`,
	});
}
