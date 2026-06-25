import { eq } from "drizzle-orm";
import { nfceconfiguracao } from "@/repositories/schema.js";
import { db } from "./connection";

export type NfceConfiguracao = typeof nfceconfiguracao.$inferSelect;
export type NovaNfceConfiguracao = typeof nfceconfiguracao.$inferInsert;

export async function buscarNfceConfiguracaoPorEmpresa(idempresa: string) {
	const [registro] = await db
		.select()
		.from(nfceconfiguracao)
		.where(eq(nfceconfiguracao.idempresa, idempresa));

	return registro;
}

export async function criarNfceConfiguracao(dados: NovaNfceConfiguracao) {
	const [registro] = await db
		.insert(nfceconfiguracao)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarNfceConfiguracao(
	id: string,
	dados: Partial<NovaNfceConfiguracao>,
) {
	const [registro] = await db
		.update(nfceconfiguracao)
		.set(dados)
		.where(eq(nfceconfiguracao.id, id))
		.returning();

	return registro;
}
