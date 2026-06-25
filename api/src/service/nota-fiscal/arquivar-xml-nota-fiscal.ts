import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { arquivarNotaFiscalXmlSeNaoExistir } from "@/repositories/nota-fiscal-xml-repositories.js";
import { salvarXmlEmDisco, type TipoXmlNfe } from "@/util/xml-storage.js";

export type ArquivarXmlNotaFiscalParametros = {
	idnotafiscal: string;
	idempresa: string;
	xml: string;
	chavenfe?: string | null | undefined;
	protocolonfe?: string | null | undefined;
	tipo?: TipoXmlNfe;
};

export async function arquivarXmlNotaFiscal({
	idnotafiscal,
	idempresa,
	xml,
	chavenfe,
	protocolonfe,
	tipo = "assinado",
}: ArquivarXmlNotaFiscalParametros) {
	const hashsha256 = createHash("sha256").update(xml, "utf8").digest("hex");
	const tamanhobytes = Buffer.byteLength(xml, "utf8");

	let caminhoanexo: string | null = null;

	if (chavenfe?.trim()) {
		try {
			caminhoanexo = await salvarXmlEmDisco(idempresa, chavenfe.trim(), tipo, xml);
		} catch (erro) {
			console.error("Falha ao salvar XML em disco:", erro);
		}
	}

	return arquivarNotaFiscalXmlSeNaoExistir({
		id: uuidv4(),
		idnotafiscal,
		idempresa,
		chavenfe: chavenfe?.trim() || null,
		protocolonfe: protocolonfe?.trim() || null,
		hashsha256,
		tamanhobytes,
		caminhoanexo,
		tipoxml: tipo,
		criadoem: new Date().toISOString(),
	});
}
