import { eq } from "drizzle-orm";
import { notafiscalxml } from "@/repositories/schema.js";
import { db } from "./connection";

export type NotaFiscalXml = typeof notafiscalxml.$inferSelect;
export type NovaNotaFiscalXml = typeof notafiscalxml.$inferInsert;

export async function buscarNotaFiscalXmlPorNota(idnotafiscal: string) {
	const [registro] = await db
		.select()
		.from(notafiscalxml)
		.where(eq(notafiscalxml.idnotafiscal, idnotafiscal));

	return registro;
}

export async function criarNotaFiscalXml(dados: NovaNotaFiscalXml) {
	const [registro] = await db
		.insert(notafiscalxml)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarNotaFiscalXml(
	id: string,
	dados: Partial<
		Pick<
			NovaNotaFiscalXml,
			| "chavenfe"
			| "protocolonfe"
			| "hashsha256"
			| "tamanhobytes"
			| "caminhoanexo"
			| "tipoxml"
		>
	>,
) {
	const [registro] = await db
		.update(notafiscalxml)
		.set(dados)
		.where(eq(notafiscalxml.id, id))
		.returning();

	return registro;
}

export async function arquivarNotaFiscalXmlSeNaoExistir(dados: NovaNotaFiscalXml) {
	const existente = await buscarNotaFiscalXmlPorNota(dados.idnotafiscal);

	if (existente) {
		if (!existente.caminhoanexo && dados.caminhoanexo) {
			const atualizado = await atualizarNotaFiscalXml(existente.id, {
				chavenfe: dados.chavenfe ?? existente.chavenfe,
				protocolonfe: dados.protocolonfe ?? existente.protocolonfe,
				hashsha256: dados.hashsha256 ?? existente.hashsha256,
				tamanhobytes: dados.tamanhobytes ?? existente.tamanhobytes,
				caminhoanexo: dados.caminhoanexo,
				tipoxml: dados.tipoxml ?? existente.tipoxml,
			});
			return atualizado ?? existente;
		}
		return existente;
	}

	return criarNotaFiscalXml(dados);
}

export async function listarXmlsPorEmpresa(idempresa: string) {
	return db
		.select()
		.from(notafiscalxml)
		.where(eq(notafiscalxml.idempresa, idempresa));
}
