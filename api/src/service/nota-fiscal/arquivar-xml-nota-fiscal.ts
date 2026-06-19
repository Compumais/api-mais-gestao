import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { arquivarNotaFiscalXmlSeNaoExistir } from "@/repositories/nota-fiscal-xml-repositories.js";

export type ArquivarXmlNotaFiscalParametros = {
	idnotafiscal: string;
	idempresa: string;
	xml: string;
	chavenfe?: string | null | undefined;
	protocolonfe?: string | null | undefined;
};

export async function arquivarXmlNotaFiscal({
	idnotafiscal,
	idempresa,
	xml,
	chavenfe,
	protocolonfe,
}: ArquivarXmlNotaFiscalParametros) {
	const hashsha256 = createHash("sha256").update(xml, "utf8").digest("hex");
	const tamanhobytes = Buffer.byteLength(xml, "utf8");

	return arquivarNotaFiscalXmlSeNaoExistir({
		id: uuidv4(),
		idnotafiscal,
		idempresa,
		chavenfe: chavenfe?.trim() || null,
		protocolonfe: protocolonfe?.trim() || null,
		hashsha256,
		tamanhobytes,
		criadoem: new Date().toISOString(),
	});
}
