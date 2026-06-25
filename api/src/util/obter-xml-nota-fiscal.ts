import { readFile } from "node:fs/promises";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarNotaFiscalXmlPorNota } from "@/repositories/nota-fiscal-xml-repositories.js";
import { obterCaminhoCompletoXml } from "@/util/xml-storage.js";

export async function obterXmlAutorizadoNotaFiscal(
	idnotafiscal: string,
): Promise<string | null> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);
	if (!nota) return null;

	if (nota.arquivoxmlautorizada?.trim()) {
		return nota.arquivoxmlautorizada;
	}

	const registroXml = await buscarNotaFiscalXmlPorNota(idnotafiscal);
	if (!registroXml?.caminhoanexo) {
		return null;
	}

	try {
		return await readFile(
			obterCaminhoCompletoXml(registroXml.caminhoanexo),
			"utf8",
		);
	} catch {
		return null;
	}
}

export async function obterXmlNotaFiscal(
	idnotafiscal: string,
	tipo: "assinado" | "autorizado",
): Promise<string | null> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);
	if (!nota) return null;

	const conteudoBanco =
		tipo === "autorizado"
			? nota.arquivoxmlautorizada
			: nota.arquivoxmlassinado;

	if (conteudoBanco?.trim()) {
		return conteudoBanco;
	}

	const registroXml = await buscarNotaFiscalXmlPorNota(idnotafiscal);
	if (!registroXml?.caminhoanexo) {
		return null;
	}

	if (registroXml.tipoxml && registroXml.tipoxml !== tipo) {
		return null;
	}

	try {
		return await readFile(
			obterCaminhoCompletoXml(registroXml.caminhoanexo),
			"utf8",
		);
	} catch {
		return null;
	}
}
