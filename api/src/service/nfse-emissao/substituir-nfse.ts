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
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { isLayoutNfseDps } from "@/util/validar-pre-requisitos-emissao-nfse.js";

export type ResultadoSubstituicaoNfse = {
	idnotafiscal: string;
	idnotafiscalsubstituta: string;
	status: number;
	motivo?: string;
	pendente?: boolean;
	protocolo?: string | null;
};

type SubstituirNfseParametros = {
	idusuario: string;
	idnotafiscal: string;
	idnotafiscalsubstituta: string;
	motivo: string;
};

function extrairDadosEmissao(dados: unknown): DadosEmissaoNfseSalvos | null {
	if (!dados || typeof dados !== "object") {
		return null;
	}
	return dados as DadosEmissaoNfseSalvos;
}

export async function substituirNfseService({
	idusuario,
	idnotafiscal,
	idnotafiscalsubstituta,
	motivo,
}: SubstituirNfseParametros): Promise<HttpResponse<ResultadoSubstituicaoNfse>> {
	const [nota, substituta] = await Promise.all([
		buscarNotaFiscalPorId(idnotafiscal),
		buscarNotaFiscalPorId(idnotafiscalsubstituta),
	]);

	if (!nota || !substituta) {
		return httpNaoEncontrado();
	}

	if (nota.modelo !== MODELO_NFSE || nota.tipoorigem !== TIPO_ORIGEM_NFSE) {
		return httpBadRequest("Nota original não é NFS-e de serviço");
	}

	if (
		substituta.modelo !== MODELO_NFSE ||
		substituta.tipoorigem !== TIPO_ORIGEM_NFSE
	) {
		return httpBadRequest("Nota substituta não é NFS-e de serviço");
	}

	if (nota.idempresa !== substituta.idempresa) {
		return httpBadRequest("Nota original e substituta devem ser da mesma empresa");
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		nota.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (nota.status !== NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("Somente NFS-e autorizada pode ser substituída");
	}

	if (substituta.status !== NFE_STATUS.AUTORIZADA) {
		return httpBadRequest(
			"A NFS-e substituta precisa estar autorizada antes da substituição",
		);
	}

	const motivoNormalizado = motivo.trim();
	if (motivoNormalizado.length < 15) {
		return httpBadRequest(
			"Motivo da substituição deve ter ao menos 15 caracteres",
		);
	}

	const credenciais = await montarCredenciaisGatewayNfse(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const modoDps = isLayoutNfseDps(
		credenciais.configJson.versaolayout as string | undefined,
	);
	if (!modoDps) {
		return httpBadRequest(
			"Substituição via evento DPS está disponível apenas no layout Nota Nacional (dps-1.01)",
		);
	}

	const chaveOriginal = (nota.codigoautenticidadenfse ?? "").replace(/\D/g, "");
	const chaveSubstituta = (substituta.codigoautenticidadenfse ?? "").replace(
		/\D/g,
		"",
	);

	if (chaveOriginal.length !== 50 || chaveSubstituta.length !== 50) {
		return httpBadRequest(
			"Ambas as NFS-e precisam ter chave de acesso (50 dígitos) para substituição DPS",
		);
	}

	const emissaoSalva = extrairDadosEmissao(nota.dadosimportacao);

	const resposta = await cancelarNfseGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		dados: {
			numeroNfse: nota.numeronfse,
			chaveAcesso: chaveOriginal,
			chaveSubstituta,
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
				"Falha ao substituir NFS-e",
		);
	}

	const agora = new Date().toISOString();

	if (resposta.pendente) {
		await atualizarNotaFiscal(idnotafiscal, {
			mensagemtransmissaonfe: `Substituição DPS recebida. Protocolo: ${resposta.protocolo}. Aguardando validação do ambiente nacional.`,
			dadosimportacao: {
				...(emissaoSalva ?? {}),
				modo: "dps",
				protocoloSubstituicao: resposta.protocolo ?? null,
			} as unknown as Record<string, unknown>,
		});

		return httpOk<ResultadoSubstituicaoNfse>({
			idnotafiscal,
			idnotafiscalsubstituta,
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
			modo: "dps",
			protocoloSubstituicao: resposta.protocolo ?? null,
		} as unknown as Record<string, unknown>,
	});

	return httpOk<ResultadoSubstituicaoNfse>({
		idnotafiscal,
		idnotafiscalsubstituta,
		status: NFE_STATUS.CANCELADA,
		motivo: motivoNormalizado,
		pendente: false,
		protocolo: resposta.protocolo ?? null,
	});
}
