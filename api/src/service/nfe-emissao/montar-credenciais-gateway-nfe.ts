import { montarConfigJsonSpedNfe } from "@/util/montar-config-sped-nfe.js";
import { descriptografarCredenciaisCertificado } from "@/util/montar-config-sped-nfe.js";
import { carregarContextoEmissaoNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

export async function montarCredenciaisGatewayNfe(idempresa: string) {
	const contexto = await carregarContextoEmissaoNfe(idempresa);

	if (contexto.pendencias.length > 0) {
		return {
			ok: false as const,
			pendencias: contexto.pendencias,
		};
	}

	const { empresa, empresaFiscal, nfeConfiguracao, certificadoAtivo } = contexto;

	if (!empresa || !empresaFiscal || !nfeConfiguracao || !certificadoAtivo) {
		return {
			ok: false as const,
			pendencias: [
				{
					codigo: "CONTEXTO_INCOMPLETO",
					mensagem: "Contexto fiscal incompleto para evento NF-e",
				},
			],
		};
	}

	const configJson = montarConfigJsonSpedNfe({
		empresa,
		empresaFiscal,
		nfeConfiguracao,
	});
	const credenciais = descriptografarCredenciaisCertificado(certificadoAtivo);

	return {
		ok: true as const,
		configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		nfeConfiguracao,
	};
}
