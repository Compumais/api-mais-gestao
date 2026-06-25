import type { HttpResponse } from "@/model/http-model.js";
import { gerarDanfeGateway } from "@/lib/nfe-gateway-client.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { obterXmlAutorizadoNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type GerarDanfeNfeParametros = {
	idusuario: string;
	idnotafiscal: string;
};

type GerarDanfeNfeResposta = {
	pdf: Buffer;
	filename: string;
};

export async function gerarDanfeNfeService({
	idusuario,
	idnotafiscal,
}: GerarDanfeNfeParametros): Promise<HttpResponse<GerarDanfeNfeResposta>> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	if (!nota) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		nota.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (nota.status !== NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("DANFE disponível apenas para NF-e autorizada");
	}

	const xml = await obterXmlAutorizadoNotaFiscal(idnotafiscal);
	if (!xml) {
		return httpBadRequest("XML autorizado não encontrado para esta NF-e");
	}

	const respostaGateway = await gerarDanfeGateway(xml);
	if (!respostaGateway.sucesso || !respostaGateway.pdfBase64) {
		return httpBadRequest(
			respostaGateway.erro ?? "Falha ao gerar DANFE no gateway NF-e",
		);
	}

	const chave = nota.chavenfe?.trim() || idnotafiscal;
	const prefixo = nota.modelo === "65" ? "danfce" : "danfe";

	return httpOk<GerarDanfeNfeResposta>({
		pdf: Buffer.from(respostaGateway.pdfBase64, "base64"),
		filename: `${prefixo}-${chave}.pdf`,
	});
}
