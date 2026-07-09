import { MODELO_NFSE, TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { cancelarNfseGateway } from "@/lib/nfse-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
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

export type ResultadoCancelamentoNfse = {
	idnotafiscal: string;
	status: number;
	motivo?: string;
};

type CancelarNfseParametros = {
	idusuario: string;
	idnotafiscal: string;
	motivo: string;
};

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

	const resposta = await cancelarNfseGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		dados: {
			numeroNfse: nota.numeronfse,
			codigoVerificacao: nota.codigoautenticidadenfse ?? "",
			motivo: motivoNormalizado,
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
	await atualizarNotaFiscal(idnotafiscal, {
		status: NFE_STATUS.CANCELADA,
		cancelamento: agora,
		justificativacancelamentonfe: motivoNormalizado,
	});

	return httpOk<ResultadoCancelamentoNfse>({
		idnotafiscal,
		status: NFE_STATUS.CANCELADA,
		motivo: motivoNormalizado,
	});
}
