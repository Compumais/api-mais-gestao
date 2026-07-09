import { MODELO_NFSE, TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { consultarNfsePorRpsGateway } from "@/lib/nfse-gateway-client.js";
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

export type ResultadoConsultaNfse = {
	idnotafiscal: string;
	numeroNfse?: string | null;
	codigoVerificacao?: string | null;
	link?: string | null;
	status?: number;
};

type ConsultarNfseParametros = {
	idusuario: string;
	idnotafiscal: string;
};

export async function consultarNfseService({
	idusuario,
	idnotafiscal,
}: ConsultarNfseParametros): Promise<HttpResponse<ResultadoConsultaNfse>> {
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

	const credenciais = await montarCredenciaisGatewayNfse(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const resposta = await consultarNfsePorRpsGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		dados: {
			rps: {
				numero: nota.numeronotafiscal ?? nota.numero,
				serie: nota.serie ?? "1",
				tipo: "1",
			},
			prestador: {
				cnpj: credenciais.empresa.cnpj.replace(/\D/g, ""),
				im:
					credenciais.empresaFiscal.inscricaomunicipal?.replace(/\D/g, "") ??
					"",
			},
		},
	});

	if (!resposta.sucesso) {
		return httpBadRequest(
			resposta.erro ??
				resposta.erros?.map((e) => e.mensagem).join("; ") ??
				"Consulta NFS-e não retornou resultado",
		);
	}

	const agora = new Date().toISOString();
	const atualizacao: Partial<
		import("@/model/nota-fiscal-model.js").NovaNotaFiscal
	> = {};

	if (resposta.numeroNfse) {
		atualizacao.numeronfse = resposta.numeroNfse;
		atualizacao.status = NFE_STATUS.AUTORIZADA;
		atualizacao.pendenciarps = 0;
	}
	if (resposta.codigoVerificacao) {
		atualizacao.codigoautenticidadenfse = resposta.codigoVerificacao;
	}
	if (resposta.link) {
		atualizacao.linknfse = resposta.link;
	}

	await atualizarNotaFiscal(idnotafiscal, atualizacao);

	return httpOk<ResultadoConsultaNfse>({
		idnotafiscal,
		numeroNfse: resposta.numeroNfse,
		codigoVerificacao: resposta.codigoVerificacao,
		link: resposta.link,
		status: resposta.numeroNfse
			? NFE_STATUS.AUTORIZADA
			: (nota.status ?? undefined),
	});
}
