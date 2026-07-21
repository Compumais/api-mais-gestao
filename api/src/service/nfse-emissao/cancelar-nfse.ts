import { MODELO_NFSE, TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { cancelarNfseGateway } from "@/lib/nfse-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { DadosEmissaoNfseSalvos } from "@/model/nfse-emissao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import { montarCredenciaisGatewayNfse } from "@/service/nfse-emissao/montar-credenciais-gateway-nfse.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { montarIdentificadorXmlNfse } from "@/util/identificador-xml-nfse.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { isLayoutNfseDps } from "@/util/validar-pre-requisitos-emissao-nfse.js";

export type ResultadoCancelamentoNfse = {
	idnotafiscal: string;
	status: number;
	motivo?: string;
	pendente?: boolean;
	protocolo?: string | null;
};

type CancelarNfseParametros = {
	idusuario: string;
	idnotafiscal: string;
	motivo: string;
};

function extrairDadosEmissao(dados: unknown): DadosEmissaoNfseSalvos | null {
	if (!dados || typeof dados !== "object") {
		return null;
	}
	return dados as DadosEmissaoNfseSalvos;
}

export async function cancelarNfseService({
	idusuario,
	idnotafiscal,
	motivo,
}: CancelarNfseParametros): Promise<HttpResponse<ResultadoCancelamentoNfse>> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	if (!nota) {
		return httpNaoEncontrado();
	}

	if (nota.modelo !== MODELO_NFSE || nota.tipoorigem !== TIPO_ORIGEM_NFSE) {
		return httpBadRequest("Nota informada não é NFS-e de serviço");
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		nota.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (nota.status !== NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("Somente NFS-e autorizada pode ser cancelada");
	}

	const motivoNormalizado = motivo.trim();
	if (motivoNormalizado.length < 15) {
		return httpBadRequest(
			"Motivo do cancelamento deve ter ao menos 15 caracteres",
		);
	}

	if (!nota.numeronfse) {
		return httpBadRequest("NFS-e sem número para cancelamento");
	}

	const credenciais = await montarCredenciaisGatewayNfse(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const emissaoSalva = extrairDadosEmissao(nota.dadosimportacao);
	const modoDps =
		emissaoSalva?.modo === "dps" ||
		isLayoutNfseDps(credenciais.configJson.versaolayout as string | undefined);

	const chaveAcesso = (nota.codigoautenticidadenfse ?? "").replace(/\D/g, "");
	if (modoDps && chaveAcesso.length !== 50) {
		return httpBadRequest(
			"Chave de acesso da NFS-e (50 dígitos) é obrigatória para cancelamento DPS. Consulte o status da DPS antes de cancelar.",
		);
	}

	const resposta = await cancelarNfseGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		dados: {
			numeroNfse: nota.numeronfse,
			codigoVerificacao: nota.codigoautenticidadenfse ?? "",
			chaveAcesso: chaveAcesso || undefined,
			motivo: motivoNormalizado,
			codigoMotivo: 1,
			prestador: {
				cnpj: credenciais.empresa.cnpj.replace(/\D/g, ""),
				im:
					credenciais.empresaFiscal.inscricaomunicipal?.replace(/\D/g, "") ??
					"",
				municipioIbge:
					credenciais.nfseConfiguracao.codigomunicipioibge ??
					credenciais.empresaFiscal.codigomunicipioibge ??
					"",
			},
		},
	});

	if (!resposta.sucesso) {
		return httpBadRequest(
			resposta.erro ??
				resposta.erros?.map((e) => e.mensagem).join("; ") ??
				"Falha ao cancelar NFS-e",
		);
	}

	const agora = new Date().toISOString();

	if (resposta.pendente) {
		await atualizarNotaFiscal(idnotafiscal, {
			mensagemtransmissaonfe: `Cancelamento DPS recebido. Protocolo: ${resposta.protocolo}. Aguardando validação do ambiente nacional.`,
			dadosimportacao: {
				...(emissaoSalva ?? {}),
				modo: "dps",
				protocoloCancelamento: resposta.protocolo ?? null,
			} as unknown as Record<string, unknown>,
		});

		return httpOk<ResultadoCancelamentoNfse>({
			idnotafiscal,
			status: NFE_STATUS.AUTORIZADA,
			motivo: motivoNormalizado,
			pendente: true,
			protocolo: resposta.protocolo ?? null,
		});
	}

	await atualizarNotaFiscal(idnotafiscal, {
		status: NFE_STATUS.CANCELADA,
		cancelamento: agora,
		justificativacancelamentonfe: motivoNormalizado,
		mensagemtransmissaonfe: null,
		dadosimportacao: {
			...(emissaoSalva ?? {}),
			...(modoDps ? { modo: "dps" as const } : {}),
			protocoloCancelamento: resposta.protocolo ?? emissaoSalva?.protocoloCancelamento ?? null,
		} as unknown as Record<string, unknown>,
	});

	if (resposta.xmlEnviado || resposta.xml) {
		await arquivarXmlNotaFiscal({
			idempresa: nota.idempresa,
			idnotafiscal,
			tipo: "cancelado",
			xml: resposta.xml ?? resposta.xmlEnviado ?? "",
			chavenfe: montarIdentificadorXmlNfse(
				{
					codigoVerificacao: nota.codigoautenticidadenfse,
					numeroNfse: nota.numeronfse,
				},
				idnotafiscal,
			),
			protocolonfe: resposta.protocolo ?? undefined,
		});
	}

	return httpOk<ResultadoCancelamentoNfse>({
		idnotafiscal,
		status: NFE_STATUS.CANCELADA,
		motivo: motivoNormalizado,
		pendente: false,
		protocolo: resposta.protocolo ?? null,
	});
}
