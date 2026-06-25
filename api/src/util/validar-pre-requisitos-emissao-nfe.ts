import type { EmpresaFiscal } from "@/model/nfe-emissao-model.js";
import type { NfeConfiguracao } from "@/model/nfe-emissao-model.js";
import type { CertificadoDigitalResumo } from "@/model/nfe-emissao-model.js";
import type { NfeSerie } from "@/model/nfe-emissao-model.js";
import type { Empresa } from "@/model/empresa-model.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";

export type PendenciaPreRequisitoNfe = {
	codigo: string;
	mensagem: string;
};

const CAMPOS_OBRIGATORIOS_FISCAL: Array<keyof EmpresaFiscal> = [
	"razaosocial",
	"inscricaoestadual",
	"crt",
	"cnae",
	"logradouro",
	"numero",
	"bairro",
	"cep",
	"codigomunicipioibge",
	"uf",
];

export function validarPreRequisitosEmissaoNfe({
	empresa,
	empresaFiscal,
	nfeConfiguracao,
	certificadoAtivo,
	seriePadrao,
}: {
	empresa: Empresa;
	empresaFiscal: EmpresaFiscal | undefined;
	nfeConfiguracao: NfeConfiguracao | undefined;
	certificadoAtivo: CertificadoDigitalResumo | undefined;
	seriePadrao: NfeSerie | undefined;
}): PendenciaPreRequisitoNfe[] {
	const pendencias: PendenciaPreRequisitoNfe[] = [];

	if (!empresaFiscal) {
		pendencias.push({
			codigo: "EMPRESA_FISCAL_AUSENTE",
			mensagem: "Cadastre os dados fiscais da empresa",
		});
		return pendencias;
	}

	for (const campo of CAMPOS_OBRIGATORIOS_FISCAL) {
		const valor = empresaFiscal[campo];
		if (valor === null || valor === undefined || valor === "") {
			pendencias.push({
				codigo: `CAMPO_FISCAL_${campo.toUpperCase()}`,
				mensagem: `Preencha o campo fiscal: ${campo}`,
			});
		}
	}

	if (!nfeConfiguracao) {
		pendencias.push({
			codigo: "NFE_CONFIG_AUSENTE",
			mensagem: "Configure os parâmetros de NF-e",
		});
	} else if (!nfeConfiguracao.ambiente) {
		pendencias.push({
			codigo: "NFE_AMBIENTE",
			mensagem: "Defina o ambiente (homologação ou produção)",
		});
	}

	if (!certificadoAtivo) {
		pendencias.push({
			codigo: "CERTIFICADO_ATIVO",
			mensagem: "Cadastre e ative um certificado digital A1",
		});
	} else {
		const cnpjEmpresa = normalizarCnpj(empresa.cnpj);
		if (certificadoAtivo.cnpjcertificado !== cnpjEmpresa) {
			pendencias.push({
				codigo: "CERTIFICADO_CNPJ",
				mensagem: "CNPJ do certificado deve ser igual ao CNPJ da empresa",
			});
		}

		if (certificadoAtivo.validadefim) {
			const validade = new Date(certificadoAtivo.validadefim);
			if (validade < new Date()) {
				pendencias.push({
					codigo: "CERTIFICADO_VENCIDO",
					mensagem: "Certificado digital vencido",
				});
			}
		}
	}

	if (!seriePadrao) {
		pendencias.push({
			codigo: "SERIE_PADRAO",
			mensagem: "Cadastre uma série padrão para o modelo 55",
		});
	}

	return pendencias;
}
