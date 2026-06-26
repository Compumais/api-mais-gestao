import { normalizarCnpj } from "@/util/criptografia-certificado.js";
import { validarEstruturaChaveNfe } from "@/util/decodificar-chave-nfe.js";
import {
	extrairMetadadosXmlNfeConsulta,
	type MetadadosXmlNfeConsulta,
} from "@/util/extrair-metadados-xml-nfe-consulta.js";

export type InconsistenciaPreConsultaChave = {
	codigo: string;
	mensagem: string;
	severidade: "erro" | "aviso";
};

export type ResultadoPreConsultaChaveNfe = {
	ok: boolean;
	inconsistencias: InconsistenciaPreConsultaChave[];
	metadadosXml: MetadadosXmlNfeConsulta | null;
};

function obterCnpjBase(documento: string): string {
	return normalizarCnpj(documento).slice(0, 8);
}

function formatarAmbiente(ambiente: number): string {
	return ambiente === 1 ? "Produção" : ambiente === 2 ? "Homologação" : String(ambiente);
}

export function validarPreConsultaChaveNfe({
	chave,
	cnpjEmpresa,
	ambienteEmpresa,
	xmlOpcional,
}: {
	chave: string;
	cnpjEmpresa: string;
	ambienteEmpresa: number;
	xmlOpcional?: string;
}): ResultadoPreConsultaChaveNfe {
	const inconsistencias: InconsistenciaPreConsultaChave[] = [];

	const estrutura = validarEstruturaChaveNfe(chave);
	if (!estrutura.ok) {
		inconsistencias.push({
			codigo: "CHAVE_ESTRUTURA",
			mensagem: estrutura.mensagem,
			severidade: "erro",
		});
		return { ok: false, inconsistencias, metadadosXml: null };
	}

	const cnpjEmpresaNormalizado = normalizarCnpj(cnpjEmpresa);
	let metadadosXml: MetadadosXmlNfeConsulta | null = null;

	if (xmlOpcional) {
		metadadosXml = extrairMetadadosXmlNfeConsulta(xmlOpcional);

		if (metadadosXml.chavenfe && metadadosXml.chavenfe !== chave) {
			inconsistencias.push({
				codigo: "CHAVE_XML_DIVERGENTE",
				mensagem:
					"A chave informada difere da chave encontrada no XML enviado. Use o valor de protNFe/infProt/chNFe.",
				severidade: "erro",
			});
		}

		const destinatario =
			metadadosXml.cnpjDestinatario ?? metadadosXml.cpfDestinatario;

		if (destinatario) {
			const mesmoCnpj = destinatario === cnpjEmpresaNormalizado;
			const mesmoCnpjBase =
				destinatario.length >= 8 &&
				cnpjEmpresaNormalizado.length >= 8 &&
				obterCnpjBase(destinatario) === obterCnpjBase(cnpjEmpresaNormalizado);

			if (!mesmoCnpj && !mesmoCnpjBase) {
				inconsistencias.push({
					codigo: "DESTINATARIO_DIVERGENTE",
					mensagem: `O destinatário no XML (${destinatario}) não corresponde ao CNPJ da empresa logada (${cnpjEmpresaNormalizado}). A SEFAZ não disponibilizará esta NF-e para este CNPJ.`,
					severidade: "erro",
				});
			} else if (!mesmoCnpj && mesmoCnpjBase) {
				inconsistencias.push({
					codigo: "DESTINATARIO_FILIAL",
					mensagem: `O destinatário no XML (${destinatario}) é outro estabelecimento do mesmo grupo (${cnpjEmpresaNormalizado}). Confirme se a empresa selecionada no ERP é a destinatária da nota.`,
					severidade: "aviso",
				});
			}
		} else {
			inconsistencias.push({
				codigo: "DESTINATARIO_AUSENTE_XML",
				mensagem:
					"Não foi possível identificar o destinatário (dest/CNPJ ou dest/CPF) no XML informado.",
				severidade: "aviso",
			});
		}

		if (
			metadadosXml.tpAmb !== null &&
			metadadosXml.tpAmb !== ambienteEmpresa
		) {
			inconsistencias.push({
				codigo: "AMBIENTE_DIVERGENTE",
				mensagem: `O XML foi autorizado em ${formatarAmbiente(metadadosXml.tpAmb)}, mas a configuração NF-e da empresa está em ${formatarAmbiente(ambienteEmpresa)}. Ajuste o ambiente em Configurações NF-e antes de consultar a SEFAZ.`,
				severidade: "erro",
			});
		}

		if (metadadosXml.cStatAutorizacao && metadadosXml.cStatAutorizacao !== "100") {
			inconsistencias.push({
				codigo: "NAO_AUTORIZADA",
				mensagem: `O XML indica cStat ${metadadosXml.cStatAutorizacao} (não autorizada). Notas não autorizadas não estão disponíveis na Distribuição DF-e.`,
				severidade: "erro",
			});
		}
	}

	const possuiErro = inconsistencias.some((item) => item.severidade === "erro");

	return {
		ok: !possuiErro,
		inconsistencias,
		metadadosXml,
	};
}

export function montarMensagemPreConsultaChaveNfe(
	inconsistencias: InconsistenciaPreConsultaChave[],
): string {
	return inconsistencias
		.filter((item) => item.severidade === "erro")
		.map((item) => item.mensagem)
		.join(" ");
}
