import { buscarEstadoPorSigla } from "@/constants/estados-brasil.js";
import type { Empresa } from "@/model/empresa-model.js";
import type { NfceConfiguracao } from "@/model/nfce-emissao-model.js";
import type { EmpresaFiscal } from "@/model/nfe-emissao-model.js";
import type { ConfigSpedNfe } from "@/util/montar-config-sped-nfe.js";

export function montarConfigJsonSpedNfce({
	empresa,
	empresaFiscal,
	nfceConfiguracao,
}: {
	empresa: Empresa;
	empresaFiscal: EmpresaFiscal;
	nfceConfiguracao: NfceConfiguracao;
}): ConfigSpedNfe & { modelo: number } {
	const uf = empresaFiscal.uf?.toUpperCase() ?? "";
	const estado = buscarEstadoPorSigla(uf);

	if (!estado) {
		throw new Error("UF fiscal inválida para configuração NFC-e");
	}

	const homolog = nfceConfiguracao.ambiente === 2;
	const CSCid = homolog
		? nfceConfiguracao.idcsc_homologacao
		: nfceConfiguracao.idcsc_producao;
	const CSC = homolog
		? nfceConfiguracao.csctoken_homologacao
		: nfceConfiguracao.csctoken_producao;

	return {
		atualizacao: new Date().toISOString().replace("T", " ").slice(0, 19),
		tpAmb: nfceConfiguracao.ambiente,
		razaosocial: empresaFiscal.razaosocial ?? empresa.nome,
		cnpj: empresa.cnpj.replace(/\D/g, ""),
		siglaUF: estado.idestado,
		schemes: nfceConfiguracao.schema ?? "PL_009_V4",
		versao: nfceConfiguracao.versaoleiaute ?? "4.00",
		tokenIBPT: "",
		CSC: CSC ?? "",
		CSCid: CSCid ?? "",
		modelo: 65,
		proxyConf: {
			proxyIp: "",
			proxyPort: "",
			proxyUser: "",
			proxyPass: "",
		},
	};
}
