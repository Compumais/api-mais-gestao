import { XMLParser } from "fast-xml-parser";
import type {
	MetadadosDocumentoInbound,
	TipoDocumentoInbound,
} from "@/model/nfe-inbound-model.js";
import type { StatusManifestacaoInbound } from "@/model/nfe-inbound-model.js";

export type DocumentoXmlClassificado = {
	tipo: TipoDocumentoInbound;
	xml: string;
	metadados: MetadadosDocumentoInbound;
	statusManifestacaoEvento?: StatusManifestacaoInbound;
};

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	removeNSPrefix: true,
	trimValues: true,
	parseTagValue: false,
});

function paraStr(valor: unknown): string | undefined {
	if (valor === undefined || valor === null) return undefined;
	const texto = String(valor).trim();
	return texto === "" ? undefined : texto;
}

function extrairChaveDoXml(xml: string): string | undefined {
	const match = xml.match(/Id="NFe(\d{44})"/);
	if (match?.[1]) return match[1];
	const matchCh = xml.match(/<chNFe>(\d{44})<\/chNFe>/);
	return matchCh?.[1];
}

function detectarTipoDocumento(xml: string): TipoDocumentoInbound | null {
	if (/<resNFe[\s>]/.test(xml)) return "resNFe";
	if (/<nfeProc[\s>]/.test(xml)) return "procNFe";
	if (/<procEventoNFe[\s>]/.test(xml)) return "procEventoNFe";
	return null;
}

function mapearTpEventoParaStatus(tpEvento?: string): StatusManifestacaoInbound {
	switch (tpEvento) {
		case "210200":
			return "confirmada";
		case "210210":
			return "ciencia_enviada";
		case "210220":
			return "desconhecida";
		case "210240":
			return "nao_realizada";
		default:
			return "evento_recebido";
	}
}

function obterNoRaiz(xml: string): Record<string, unknown> {
	const raiz = xmlParser.parse(xml) as Record<string, unknown>;
	const chaves = Object.keys(raiz).filter((chave) => chave !== "?xml");

	if (chaves.length === 1) {
		const chave = chaves[0] ?? "";
		return (raiz[chave] ?? {}) as Record<string, unknown>;
	}

	return raiz;
}

export function classificarXmlDfe(xml: string): DocumentoXmlClassificado {
	const tipo = detectarTipoDocumento(xml);

	if (!tipo) {
		throw new Error("Tipo de documento DF-e não reconhecido");
	}

	const conteudo = obterNoRaiz(xml);

	if (tipo === "resNFe") {
		const chavenfe = paraStr(conteudo.chNFe) ?? extrairChaveDoXml(xml);

		if (!chavenfe) {
			throw new Error("resNFe sem chave identificável");
		}

		return {
			tipo: "resNFe",
			xml,
			metadados: {
				chavenfe,
				cnpjemitente: paraStr(conteudo.CNPJ)?.replace(/\D/g, ""),
				razaoemitente: paraStr(conteudo.xNome),
				dataemissao: paraStr(conteudo.dhEmi),
				valortotal: paraStr(conteudo.vNF),
			},
		};
	}

	if (tipo === "procNFe") {
		const nfe = (conteudo.NFe ?? {}) as Record<string, unknown>;
		const infNFe = (nfe.infNFe ?? {}) as Record<string, unknown>;
		const ide = (infNFe.ide ?? {}) as Record<string, unknown>;
		const emit = (infNFe.emit ?? {}) as Record<string, unknown>;
		const total = (infNFe.total ?? {}) as Record<string, unknown>;
		const icmsTot = (total.ICMSTot ?? {}) as Record<string, unknown>;

		const chavenfe =
			paraStr(infNFe["@_Id"])?.replace(/^NFe/, "") ??
			extrairChaveDoXml(xml) ??
			"";

		if (!chavenfe) {
			throw new Error("procNFe sem chave identificável");
		}

		return {
			tipo: "procNFe",
			xml,
			metadados: {
				chavenfe,
				cnpjemitente: paraStr(emit.CNPJ)?.replace(/\D/g, ""),
				razaoemitente: paraStr(emit.xNome),
				numero: ide.nNF ? Number(ide.nNF) : undefined,
				serie: ide.serie ? Number(ide.serie) : undefined,
				dataemissao: paraStr(ide.dhEmi) ?? paraStr(ide.dEmi),
				valortotal: paraStr(icmsTot.vNF),
			},
		};
	}

	const evento = (conteudo.evento ?? conteudo.retEvento) as Record<string, unknown>;
	const infEvento = (evento?.infEvento ?? {}) as Record<string, unknown>;
	const chavenfe = paraStr(infEvento.chNFe) ?? extrairChaveDoXml(xml) ?? "";
	const tpEvento = paraStr(infEvento.tpEvento);

	if (!chavenfe) {
		throw new Error("procEventoNFe sem chave identificável");
	}

	return {
		tipo: "procEventoNFe",
		xml,
		metadados: { chavenfe },
		statusManifestacaoEvento: mapearTpEventoParaStatus(tpEvento),
	};
}
