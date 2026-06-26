import type { HttpResponse } from "@/model/http-model.js";
import { manifestarCienciaOperacaoGateway } from "@/lib/nfe-gateway-client.js";
import {
	atualizarNfeInboundDocumento,
	buscarNfeInboundDocumentoPorChave,
} from "@/repositories/nfe-inbound-repositories.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { httpBadRequest, httpOk, httpErroInterno } from "@/util/http-util.js";
import { sincronizarEmpresaNfeInboundService } from "./nfe-inbound-sync.service.js";

export type ManifestarCienciaOperacaoParametros = {
	idempresa: string;
	chavenfe: string;
	idusuario?: string;
};

export type ManifestarCienciaOperacaoResposta = {
	chavenfe: string;
	cStat?: string;
	xMotivo?: string;
	protocolo?: string;
};

export async function manifestarCienciaOperacaoService({
	idempresa,
	chavenfe,
}: ManifestarCienciaOperacaoParametros): Promise<
	HttpResponse<ManifestarCienciaOperacaoResposta>
> {
	const credenciais = await montarCredenciaisGatewayNfe(idempresa);

	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const resposta = await manifestarCienciaOperacaoGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		chaveNfe: chavenfe,
	});

	if (!resposta.sucesso) {
		return httpBadRequest(resposta.xMotivo ?? resposta.erro ?? "Falha na manifestação");
	}

	const agora = new Date().toISOString();
	const documento = await buscarNfeInboundDocumentoPorChave(idempresa, chavenfe);

	if (documento) {
		await atualizarNfeInboundDocumento(documento.id, {
			statusmanifestacao: "ciencia_enviada",
			atualizadoem: agora,
		});
	}

	try {
		await sincronizarEmpresaNfeInboundService({ idempresa });
	} catch (erro) {
		console.error("Erro ao re-sincronizar após manifestação:", erro);
	}

	return httpOk({
		chavenfe,
		cStat: resposta.cStat,
		xMotivo: resposta.xMotivo,
		protocolo: resposta.protocolo,
	});
}
