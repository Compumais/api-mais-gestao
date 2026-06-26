import { XMLParser } from "fast-xml-parser";

export type MetadadosXmlNfeConsulta = {
	chavenfe: string | null;
	tpAmb: number | null;
	cnpjDestinatario: string | null;
	cpfDestinatario: string | null;
	cStatAutorizacao: string | null;
};

function paraStr(valor: unknown): string | null {
	if (valor === null || valor === undefined) return null;
	const texto = String(valor).trim();
	return texto.length > 0 ? texto : null;
}

function normalizarDocumento(valor: string | null): string | null {
	if (!valor) return null;
	return valor.replace(/\D/g, "");
}

export function extrairMetadadosXmlNfeConsulta(xml: string): MetadadosXmlNfeConsulta {
	const parser = new XMLParser({
		ignoreAttributes: false,
		removeNSPrefix: true,
		trimValues: true,
	});

	let documento: Record<string, unknown>;

	try {
		documento = parser.parse(xml) as Record<string, unknown>;
	} catch {
		return {
			chavenfe: null,
			tpAmb: null,
			cnpjDestinatario: null,
			cpfDestinatario: null,
			cStatAutorizacao: null,
		};
	}

	const nfeProc = documento.nfeProc as Record<string, unknown> | undefined;
	const nfe = (nfeProc?.NFe ?? documento.NFe) as Record<string, unknown> | undefined;
	const infNFe = nfe?.infNFe as Record<string, unknown> | undefined;
	const ide = infNFe?.ide as Record<string, unknown> | undefined;
	const dest = infNFe?.dest as Record<string, unknown> | undefined;
	const protNFe = (nfeProc?.protNFe ?? documento.protNFe) as
		| Record<string, unknown>
		| undefined;
	const infProt = protNFe?.infProt as Record<string, unknown> | undefined;

	const idAttr = infNFe?.["@_Id"];
	const chaveDoAttr =
		typeof idAttr === "string" ? idAttr.replace(/^NFe/i, "") : null;

	const tpAmbRaw = ide?.tpAmb;
	const tpAmb =
		tpAmbRaw !== undefined && tpAmbRaw !== null ? Number(tpAmbRaw) : null;

	return {
		chavenfe: normalizarDocumento(
			paraStr(infProt?.chNFe) ?? chaveDoAttr,
		),
		tpAmb: Number.isFinite(tpAmb) ? tpAmb : null,
		cnpjDestinatario: normalizarDocumento(paraStr(dest?.CNPJ)),
		cpfDestinatario: normalizarDocumento(paraStr(dest?.CPF)),
		cStatAutorizacao: paraStr(infProt?.cStat),
	};
}
