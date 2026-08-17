import { buscarCertificadoAtivoPorEmpresa } from "@/repositories/certificado-digital-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import { descriptografarCredenciaisCertificado } from "@/util/montar-config-sped-nfe.js";
import { montarConfigJsonSpedNfce } from "@/util/montar-config-sped-nfce.js";

export async function montarCredenciaisGatewayNfce(idempresa: string) {
	const [empresa, empresaFiscal, nfceConfiguracao, certificadoAtivo] =
		await Promise.all([
			buscarEmpresaPorId(idempresa),
			buscarEmpresaFiscalPorEmpresa(idempresa),
			buscarNfceConfiguracaoPorEmpresa(idempresa),
			buscarCertificadoAtivoPorEmpresa(idempresa),
		]);

	const pendencias: Array<{ codigo: string; mensagem: string }> = [];

	if (!empresaFiscal?.uf) {
		pendencias.push({
			codigo: "EMPRESA_FISCAL_AUSENTE",
			mensagem: "Cadastre os dados fiscais da empresa (UF) para evento NFC-e",
		});
	}

	if (!nfceConfiguracao?.ambiente) {
		pendencias.push({
			codigo: "NFCE_CONFIG_AUSENTE",
			mensagem: "Configure o ambiente da NFC-e em Configurações",
		});
	}

	if (!certificadoAtivo) {
		pendencias.push({
			codigo: "CERTIFICADO_ATIVO",
			mensagem: "Cadastre e ative um certificado digital A1",
		});
	}

	if (pendencias.length > 0) {
		return {
			ok: false as const,
			pendencias,
		};
	}

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
