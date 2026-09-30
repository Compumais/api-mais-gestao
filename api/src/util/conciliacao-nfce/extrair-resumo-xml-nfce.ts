import { XMLParser } from "fast-xml-parser";
import { decodificarChaveNfe } from "@/util/decodificar-chave-nfe.js";
import type { ResumoDocumentoNfce } from "./tipos-conciliacao-nfce.js";

function registro(valor: unknown): Record<string, unknown> | null {
	if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
	return valor as Record<string, unknown>;
}

function lista(valor: unknown): unknown[] {
	if (valor == null) return [];
	return Array.isArray(valor) ? valor : [valor];
}

function texto(valor: unknown): string | null {
	if (valor == null) return null;
	const limpo = String(valor).trim();
	return limpo === "" ? null : limpo;
}

function numero(valor: unknown): number | null {
	if (valor == null || String(valor).trim() === "") return null;
	const n = Number(String(valor).replace(",", "."));
	return Number.isFinite(n) ? n : null;
}

function documentoPessoa(valor: unknown): string | null {
	const digitos = texto(valor)?.replace(/\D/g, "") ?? "";
	return digitos.length === 11 || digitos.length === 14 ? digitos : null;
}

export function resumoDaChaveNfce(chave: string): Partial<ResumoDocumentoNfce> {
	const decodificada = decodificarChaveNfe(chave.replace(/\D/g, ""));
	if (!decodificada) return {};
	return {
		chave: decodificada.chave,
		cnpjEmitente: decodificada.cnpjEmitente,
		modelo: decodificada.modelo,
		serie: String(Number(decodificada.serie)),
		numero: String(Number(decodificada.numero)),
		tpEmis: decodificada.tipoEmissao,
	};
}

export function extrairResumoXmlNfce(
	xml?: string | null,
): ResumoDocumentoNfce | null {
	if (!xml?.trim()) return null;

	const parser = new XMLParser({
		ignoreAttributes: false,
		removeNSPrefix: true,
		trimValues: true,
		parseTagValue: false,
	});

	let documento: Record<string, unknown>;
	try {
		documento = parser.parse(xml) as Record<string, unknown>;
	} catch {
		return null;
	}

	const nfeProc = registro(documento.nfeProc);
	const nfe = registro(nfeProc?.NFe ?? documento.NFe);
	const infNFe = registro(nfe?.infNFe);
	const ide = registro(infNFe?.ide);
	const emit = registro(infNFe?.emit);
	const dest = registro(infNFe?.dest);
	const total = registro(registro(infNFe?.total)?.ICMSTot);
	const dets = lista(infNFe?.det).map((item) => registro(registro(item)?.prod));
	const pagamentos = lista(registro(infNFe?.pag)?.detPag)
		.map((item) => registro(item))
		.filter((item): item is Record<string, unknown> => item != null)
		.map((item) => ({
			tPag: texto(item.tPag) ?? "",
			vPag: numero(item.vPag) ?? 0,
		}))
		.filter((item) => item.tPag !== "");

	const idAttr = infNFe?.["@_Id"];
	const chaveAttr =
		typeof idAttr === "string" ? idAttr.replace(/^NFe/i, "") : null;
	const prot = registro(nfeProc?.protNFe ?? documento.protNFe);
	const infProt = registro(prot?.infProt);
	const chave = texto(infProt?.chNFe)?.replace(/\D/g, "") || chaveAttr;
	const daChave = chave ? resumoDaChaveNfce(chave) : {};

	const quantidades = dets
		.map((item) => numero(item?.qCom))
		.filter((item): item is number => item != null);

	return {
		cnpjEmitente: documentoPessoa(emit?.CNPJ) ?? daChave.cnpjEmitente ?? null,
		modelo: texto(ide?.mod) ?? daChave.modelo ?? null,
		serie: texto(ide?.serie) ?? daChave.serie ?? null,
		numero: texto(ide?.nNF) ?? daChave.numero ?? null,
		tpEmis: texto(ide?.tpEmis) ?? daChave.tpEmis ?? null,
		chave: chave && chave.length === 44 ? chave : (daChave.chave ?? null),
		documentoDestinatario:
			documentoPessoa(dest?.CPF) ?? documentoPessoa(dest?.CNPJ) ?? null,
		valorTotal: numero(total?.vNF),
		quantidadeItens: dets.length > 0 ? dets.length : null,
		quantidadeTotal:
			quantidades.length > 0
				? quantidades.reduce((acc, item) => acc + item, 0)
				: null,
		desconto: numero(total?.vDesc),
		acrescimo: numero(total?.vOutro),
		pagamentos,
	};
}
