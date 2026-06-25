import { buscarEstadoPorSigla } from "@/constants/estados-brasil.js";
import type { CertificadoDigital } from "@/model/nfe-emissao-model.js";
import type { Empresa } from "@/model/empresa-model.js";
import type { EmpresaFiscal } from "@/model/nfe-emissao-model.js";
import type { NfeConfiguracao } from "@/model/nfe-emissao-model.js";
import { descriptografarTexto } from "@/util/criptografia-certificado.js";
import { NFE_CONFIG_PADRAO } from "@/util/nfe-config-padrao.js";

export type ConfigSpedNfe = {
	atualizacao: string;
	tpAmb: number;
	razaosocial: string;
	cnpj: string;
	siglaUF: string;
	schemes: string;
	versao: string;
	tokenIBPT?: string;
	CSC?: string;
	CSCid?: string;
	proxyConf?: {
		proxyIp: string;
		proxyPort: string;
		proxyUser: string;
		proxyPass: string;
	};
};

export type CredenciaisCertificadoSped = {
	pfxBase64: string;
	senha: string;
};

export function montarConfigJsonSpedNfe({
	empresa,
	empresaFiscal,
	nfeConfiguracao,
}: {
	empresa: Empresa;
	empresaFiscal: EmpresaFiscal;
	nfeConfiguracao: NfeConfiguracao;
}): ConfigSpedNfe {
	const uf = empresaFiscal.uf?.toUpperCase() ?? "";
	const estado = buscarEstadoPorSigla(uf);

	if (!estado) {
		throw new Error("UF fiscal inválida para configuração NF-e");
	}

	return {
		atualizacao: new Date().toISOString().replace("T", " ").slice(0, 19),
		tpAmb: nfeConfiguracao.ambiente,
		razaosocial: empresaFiscal.razaosocial ?? empresa.nome,
		cnpj: empresa.cnpj.replace(/\D/g, ""),
		siglaUF: estado.idestado,
		schemes: NFE_CONFIG_PADRAO.schema,
		versao: NFE_CONFIG_PADRAO.versaoleiaute,
		tokenIBPT: nfeConfiguracao.tokenibpt ?? "",
		proxyConf: {
			proxyIp: "",
			proxyPort: "",
			proxyUser: "",
			proxyPass: "",
		},
	};
}

export function descriptografarCredenciaisCertificado(
	certificado: CertificadoDigital,
): CredenciaisCertificadoSped {
	const pfxBuffer = Buffer.from(
		descriptografarTexto(certificado.arquivopfxcriptografado),
		"base64",
	);

	return {
		pfxBase64: pfxBuffer.toString("base64"),
		senha: descriptografarTexto(certificado.senhacriptografada),
	};
}

export function obterCodigoUfIbge(siglaUf: string): number {
	const estado = buscarEstadoPorSigla(siglaUf);
	if (!estado) {
		throw new Error("UF inválida");
	}
	return Number(estado.codigoIbge);
}
