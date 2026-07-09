import type { Empresa } from "@/model/empresa-model.js";
import type { CertificadoDigital } from "@/model/nfe-emissao-model.js";
import type { NfseConfiguracao } from "@/model/nfse-emissao-model.js";
import type { EmpresaFiscal } from "@/repositories/empresa-fiscal-repositories.js";
import type { NfseSerie } from "@/repositories/nfse-serie-repositories.js";

export type PendenciaNfse = {
	codigo: string;
	mensagem: string;
};

export function validarPreRequisitosEmissaoNfse({
	empresa,
	empresaFiscal,
	nfseConfiguracao,
	certificadoAtivo,
	seriePadrao,
}: {
	empresa: Empresa;
	empresaFiscal?: EmpresaFiscal | null;
	nfseConfiguracao?: NfseConfiguracao | null;
	certificadoAtivo?: CertificadoDigital | null;
	seriePadrao?: NfseSerie | null;
}): PendenciaNfse[] {
	const pendencias: PendenciaNfse[] = [];

	if (!empresa.cnpj) {
		pendencias.push({
			codigo: "CNPJ_EMPRESA",
			mensagem: "CNPJ da empresa não cadastrado",
		});
	}

	if (!empresaFiscal) {
		pendencias.push({
			codigo: "EMPRESA_FISCAL",
			mensagem: "Cadastro fiscal da empresa incompleto",
		});
	} else {
		if (!empresaFiscal.inscricaomunicipal) {
			pendencias.push({
				codigo: "IM_PRESTADOR",
				mensagem: "Inscrição municipal do prestador não cadastrada",
			});
		}
		if (!empresaFiscal.codigomunicipioibge) {
			pendencias.push({
				codigo: "MUNICIPIO_IBGE",
				mensagem:
					"Código IBGE do município não cadastrado no fiscal da empresa",
			});
		}
	}

	if (!nfseConfiguracao) {
		pendencias.push({
			codigo: "NFSE_CONFIG",
			mensagem: "Configuração NFS-e não encontrada",
		});
	} else if (!nfseConfiguracao.urlwsdl) {
		pendencias.push({
			codigo: "NFSE_WSDL",
			mensagem: "URL/WSDL do provedor NFS-e não configurada",
		});
	}

	if (!certificadoAtivo) {
		pendencias.push({
			codigo: "CERTIFICADO",
			mensagem: "Certificado digital A1 ativo não encontrado",
		});
	}

	if (!seriePadrao) {
		pendencias.push({
			codigo: "SERIE_RPS",
			mensagem: "Série RPS padrão não configurada",
		});
	}

	return pendencias;
}
