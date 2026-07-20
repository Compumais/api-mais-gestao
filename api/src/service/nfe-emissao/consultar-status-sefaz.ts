import { XMLParser } from "fast-xml-parser";
import type { HttpResponse } from "@/model/http-model.js";
import { consultarStatusSefazGateway } from "@/lib/nfe-gateway-client.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	carregarContextoEmissaoNfe,
	montarPayloadGatewayEmissao,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { httpBadRequest, httpErro, httpOk, httpProibido } from "@/util/http-util.js";

const parser = new XMLParser({
	ignoreAttributes: false,
	removeNSPrefix: true,
});

function extrairStatusXml(xml?: string) {
	if (!xml) return { cStat: undefined, xMotivo: undefined };

	try {
		const parsed = parser.parse(xml) as Record<string, unknown>;
		const retorno =
			(parsed.retConsStatServ as Record<string, unknown>) ??
			(parsed.retEnviNFe as Record<string, unknown>) ??
			parsed;

		return {
			cStat: String(retorno.cStat ?? ""),
			xMotivo: String(retorno.xMotivo ?? ""),
		};
	} catch {
		return { cStat: undefined, xMotivo: undefined };
	}
}

type Parametros = {
	idempresa: string;
	idusuario: string;
};

export async function consultarStatusSefazService({
	idempresa,
	idusuario,
}: Parametros): Promise<
	HttpResponse<{
		cStat?: string;
		xMotivo?: string;
		xml?: string;
		pendencias?: Array<{ codigo: string; mensagem: string }>;
	}>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const contexto = await carregarContextoEmissaoNfe(idempresa);

	if (contexto.pendencias.length > 0) {
		return httpOk({
			pendencias: contexto.pendencias,
		});
	}

	const {
		empresa,
		empresaFiscal,
		nfeConfiguracao,
		certificadoAtivo,
		seriePadrao,
	} = contexto;

	const payload = await montarPayloadGatewayEmissao({
		empresa: empresa!,
		empresaFiscal: empresaFiscal!,
		nfeConfiguracao: nfeConfiguracao!,
		certificadoAtivo: certificadoAtivo!,
		numeroNf: seriePadrao!.numeroproximo,
		serie: seriePadrao!.serie,
	});

	const resposta = await consultarStatusSefazGateway(payload);

	if (!resposta.sucesso) {
		return httpBadRequest(resposta.erro ?? "Falha ao consultar status SEFAZ");
	}

	const status = extrairStatusXml(resposta.xml);

	const corpo: {
		cStat?: string;
		xMotivo?: string;
		xml?: string;
	} = {};

	const cStat = resposta.cStat ?? status.cStat;
	const xMotivo = resposta.xMotivo ?? status.xMotivo;
	if (cStat) corpo.cStat = cStat;
	if (xMotivo) corpo.xMotivo = xMotivo;
	if (resposta.xml) {
		corpo.xml = resposta.xml;
	}

	return httpOk(corpo);
}
