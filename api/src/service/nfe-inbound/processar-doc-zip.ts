import { gunzipSync } from "node:zlib";

export class ErroProcessamentoDocZip extends Error {
	constructor(
		message: string,
		public readonly codigo: "gzip_invalido" | "base64_invalido" | "xml_invalido",
	) {
		super(message);
		this.name = "ErroProcessamentoDocZip";
	}
}

export function processarDocZip(contentBase64: string): string {
	let compressed: Buffer;

	try {
		compressed = Buffer.from(contentBase64, "base64");
	} catch {
		throw new ErroProcessamentoDocZip(
			"Conteúdo docZip não é base64 válido",
			"base64_invalido",
		);
	}

	if (compressed.length === 0) {
		throw new ErroProcessamentoDocZip("docZip vazio após decode", "base64_invalido");
	}

	let xmlBuffer: Buffer;

	try {
		xmlBuffer = gunzipSync(compressed);
	} catch {
		throw new ErroProcessamentoDocZip(
			"Falha ao descompactar docZip (gzip inválido)",
			"gzip_invalido",
		);
	}

	const xml = xmlBuffer.toString("utf-8").trim();

	if (!xml.includes("<") || (!xml.includes("NFe") && !xml.includes("nfe"))) {
		throw new ErroProcessamentoDocZip(
			"Conteúdo descompactado não parece XML NF-e",
			"xml_invalido",
		);
	}

	return xml;
}
