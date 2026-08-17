import { carregarContextoEmissaoNfce } from "@/service/nfce-emissao/contexto-emissao-nfce.js";
import { descriptografarCredenciaisCertificado } from "@/util/montar-config-sped-nfe.js";
import { montarConfigJsonSpedNfce } from "@/util/montar-config-sped-nfce.js";

export async function montarCredenciaisGatewayNfce(idempresa: string) {
	const contexto = await carregarContextoEmissaoNfce(idempresa);
	const pendenciasEvento = contexto.pendencias.filter(
		(pendencia) =>
			pendencia.codigo !== "SERIE_NFCE_AUSENTE" &&
			pendencia.codigo !== "CSC_AUSENTE",
	);

	if (pendenciasEvento.length > 0) {
		return {
			ok: false as const,
			pendencias: pendenciasEvento,
		};
	}

	const { empresa, empresaFiscal, nfceConfiguracao, certificadoAtivo } =
		contexto;

	if (!empresa || !empresaFiscal || !nfceConfiguracao || !certificadoAtivo) {
		return {
			ok: false as const,
			pendencias: [
				{
					codigo: "CONTEXTO_INCOMPLETO",
					mensagem: "Contexto fiscal incompleto para evento NFC-e",
				},
			],
		};
	}

	const configJson = montarConfigJsonSpedNfce({
		empresa,
		empresaFiscal,
		nfceConfiguracao,
	});
	const credenciais = descriptografarCredenciaisCertificado(certificadoAtivo);

	return {
		ok: true as const,
		configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
	};
}
