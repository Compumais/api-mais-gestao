import type { Empresa } from "@/model/empresa-model.js";
import type { NfceConfiguracao } from "@/model/nfce-emissao-model.js";
import type {
	CertificadoDigitalResumo,
	EmpresaFiscal,
	NfeSerie,
} from "@/model/nfe-emissao-model.js";
import { normalizarCnpj } from "@/util/criptografia-certificado.js";

export type PendenciaPreRequisitoNfce = {
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

export function validarPreRequisitosEmissaoNfce({
	empresa,
	empresaFiscal,
	nfceConfiguracao,
	certificadoAtivo,
	seriePadrao,
}: {
	empresa: Empresa;
	empresaFiscal: EmpresaFiscal | undefined;
	nfceConfiguracao: NfceConfiguracao | undefined;
	certificadoAtivo: CertificadoDigitalResumo | undefined;
	seriePadrao: NfeSerie | undefined;
}): PendenciaPreRequisitoNfce[] {
	const pendencias: PendenciaPreRequisitoNfce[] = [];

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

	if (!nfceConfiguracao) {
		pendencias.push({
			codigo: "NFCE_CONFIG_AUSENTE",
			mensagem: "Configure a NFC-e em Configurações",
		});
	} else if (!nfceConfiguracao.ambiente) {
		pendencias.push({
			codigo: "NFCE_AMBIENTE",
			mensagem: "Defina o ambiente (homologação ou produção) da NFC-e",
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

	if (!seriePadrao || seriePadrao.modelo !== "65") {
		pendencias.push({
			codigo: "SERIE_NFCE_AUSENTE",
			mensagem: "Cadastre uma série padrão modelo 65 para NFC-e",
		});
	}

	if (nfceConfiguracao) {
		const homolog = nfceConfiguracao.ambiente === 2;
		const idCsc = homolog
			? nfceConfiguracao.idcsc_homologacao
			: nfceConfiguracao.idcsc_producao;
		const tokenCsc = homolog
			? nfceConfiguracao.csctoken_homologacao
			: nfceConfiguracao.csctoken_producao;

		if (!idCsc || !tokenCsc) {
			pendencias.push({
				codigo: "CSC_AUSENTE",
				mensagem: `Informe o CSC de ${homolog ? "homologação" : "produção"} na configuração NFC-e`,
			});
		}
	}

	return pendencias;
}
