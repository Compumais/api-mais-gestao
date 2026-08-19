import { cancelarNfeGateway } from "@/lib/nfe-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import { enfileirarEnvioDominioSilencioso } from "@/service/dominio/enfileirar-envio-dominio.js";
import { montarCredenciaisGatewayNfce } from "@/service/nfce-emissao/montar-credenciais-gateway-nfce.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { estornarIntegracaoNotaFiscalVendaService } from "@/service/nota-fiscal/estornar-integracao-nota-fiscal-venda.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	MENSAGEM_NFCE_NO_FLUXO_NFE,
	MENSAGEM_NFE_NO_FLUXO_NFCE,
	notaEhModeloNfce65,
	notaEhModeloNfe55,
} from "@/util/modelo-documento-fiscal-fluxo.js";
import { resolverModeloDocumentoFiscal } from "@/util/resolver-modelo-documento-fiscal.js";
import { normalizarCodigoStatusNfe } from "@/util/resolver-status-emissao-nfe.js";
import {
	normalizarJustificativaNfe,
	resolverStatusCancelamentoNfe,
	validarCancelamentoNfe,
} from "@/util/validar-eventos-nfe.js";
import { salvarXmlEventoEmDisco } from "@/util/xml-storage.js";

export type ResultadoCancelamentoNfe = {
	idnotafiscal: string;
	status: number;
	cStat?: string;
	xMotivo?: string;
	protocolo?: string;
};

type CancelarNfeVendaParametros = {
	idusuario: string;
	idnotafiscal: string;
	justificativa: string;
	modeloEsperado?: "55" | "65";
};

export async function cancelarNfeVendaService({
	idusuario,
	idnotafiscal,
	justificativa,
	modeloEsperado = "55",
}: CancelarNfeVendaParametros): Promise<
	HttpResponse<ResultadoCancelamentoNfe>
> {
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

	if (modeloEsperado === "55" && !notaEhModeloNfe55(nota.modelo)) {
		return httpBadRequest(MENSAGEM_NFCE_NO_FLUXO_NFE);
	}

	if (modeloEsperado === "65" && !notaEhModeloNfce65(nota.modelo)) {
		return httpBadRequest(MENSAGEM_NFE_NO_FLUXO_NFCE);
	}

	const validacao = validarCancelamentoNfe(nota, justificativa);
	if (!validacao.ok) {
		return httpBadRequest(validacao.mensagem);
	}

	const modeloSefaz = resolverModeloDocumentoFiscal(nota.modelo);
	const credenciais =
		modeloSefaz === 65
			? await montarCredenciaisGatewayNfce(nota.idempresa)
			: await montarCredenciaisGatewayNfe(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const justificativaNormalizada = normalizarJustificativaNfe(justificativa);
	const chave = nota.chavenfe!.replace(/\D/g, "");

	const resposta = await cancelarNfeGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		dados: {
			chave,
			protocolo: nota.protocolonfe!,
			justificativa: justificativaNormalizada,
		},
	});

	if (!resposta.sucesso) {
		return httpBadRequest(
			resposta.xMotivo ??
				resposta.erro ??
				"SEFAZ não autorizou o cancelamento da NF-e",
		);
	}

	const cStat = String(resposta.cStat ?? "").trim();
	const status = resolverStatusCancelamentoNfe(cStat);
	const agora = new Date().toISOString();

	if (resposta.xmlProtocolado?.trim()) {
		try {
			await salvarXmlEventoEmDisco(
				nota.idempresa,
				chave,
				"cancelado",
				resposta.xmlProtocolado,
			);
		} catch (erro) {
			console.error("Falha ao salvar XML de cancelamento:", erro);
		}
	}

	await atualizarNotaFiscal(idnotafiscal, {
		status,
		cancelamento: agora,
		justificativacancelamentonfe: justificativaNormalizada,
		mensagemprotocolonfe: resposta.xMotivo ?? null,
		codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStat),
		...(resposta.xmlProtocolado?.trim()
			? { arquivoxmlcancelada: resposta.xmlProtocolado }
			: {}),
	});

	void enfileirarEnvioDominioSilencioso({
		idempresa: nota.idempresa,
		idnotafiscal,
		tipo: "cancelamento",
	});

	await estornarIntegracaoNotaFiscalVendaService({
		idusuario,
		idnotafiscal,
	}).catch((erro) => {
		console.error(
			"Falha ao estornar integração operacional da NF cancelada:",
			erro,
		);
	});

	return httpOk<ResultadoCancelamentoNfe>({
		idnotafiscal,
		status,
		cStat,
		xMotivo: resposta.xMotivo,
		protocolo: resposta.protocolo,
	});
}
