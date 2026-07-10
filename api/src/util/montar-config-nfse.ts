import type { Empresa } from "@/model/empresa-model.js";
import type { EmpresaFiscal } from "@/repositories/empresa-fiscal-repositories.js";
import type { NfseConfiguracao as NfseConfigDb } from "@/repositories/nfse-configuracao-repositories.js";
import { descriptografarCredenciaisCertificado } from "@/util/montar-config-sped-nfe.js";

export function montarConfigJsonNfseGateway({
	empresa,
	empresaFiscal,
	nfseConfiguracao,
}: {
	empresa: Empresa;
	empresaFiscal: EmpresaFiscal;
	nfseConfiguracao: NfseConfigDb;
}): Record<string, unknown> {
	return {
		ambiente: nfseConfiguracao.ambiente,
		provedor: nfseConfiguracao.provedor,
		codigomunicipioibge:
			nfseConfiguracao.codigomunicipioibge ?? empresaFiscal.codigomunicipioibge,
		versaolayout: nfseConfiguracao.versaolayout,
		urlwsdl: nfseConfiguracao.urlwsdl,
		usarlotesincrono: nfseConfiguracao.usarlotesincrono,
		cnpj: empresa.cnpj.replace(/\D/g, ""),
		im: empresaFiscal.inscricaomunicipal?.replace(/\D/g, "") ?? "",
	};
}

export { descriptografarCredenciaisCertificado };
