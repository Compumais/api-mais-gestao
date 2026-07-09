import { carregarContextoEmissaoNfse } from "@/service/nfse-emissao/contexto-emissao-nfse.js";
import {
	descriptografarCredenciaisCertificado,
	montarConfigJsonNfseGateway,
} from "@/util/montar-config-nfse.js";

export async function montarCredenciaisGatewayNfse(idempresa: string) {
	const contexto = await carregarContextoEmissaoNfse(idempresa);

	if (contexto.pendencias.length > 0) {
		return {
			ok: false as const,
			pendencias: contexto.pendencias,
		};
	}

	const { empresa, empresaFiscal, nfseConfiguracao, certificadoAtivo } = contexto;

	if (!empresa || !empresaFiscal || !nfseConfiguracao || !certificadoAtivo) {
		return {
			ok: false as const,
			pendencias: [
				{
					codigo: "CONTEXTO_INCOMPLETO",
					mensagem: "Contexto fiscal incompleto para NFS-e",
				},
			],
		};
	}

	const configJson = montarConfigJsonNfseGateway({
		empresa,
		empresaFiscal,
		nfseConfiguracao,
	});
	const credenciais = descriptografarCredenciaisCertificado(certificadoAtivo);

	return {
		ok: true as const,
		configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		nfseConfiguracao,
		empresa,
		empresaFiscal,
		certificadoAtivo,
	};
}
