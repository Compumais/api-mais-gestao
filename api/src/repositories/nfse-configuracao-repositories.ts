import { eq } from "drizzle-orm";
import { nfseconfiguracao } from "@/repositories/schema.js";
import { db } from "./connection";

export type NfseConfiguracao = typeof nfseconfiguracao.$inferSelect;
export type NovaNfseConfiguracao = typeof nfseconfiguracao.$inferInsert;

export async function buscarNfseConfiguracaoPorEmpresa(idempresa: string) {
	const [registro] = await db
		.select()
		.from(nfseconfiguracao)
		.where(eq(nfseconfiguracao.idempresa, idempresa));

	return registro;
}

export async function criarNfseConfiguracao(dados: NovaNfseConfiguracao) {
	const [registro] = await db
		.insert(nfseconfiguracao)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarNfseConfiguracao(
	id: string,
	dados: Partial<NovaNfseConfiguracao>,
) {
	const [registro] = await db
		.update(nfseconfiguracao)
		.set(dados)
		.where(eq(nfseconfiguracao.id, id))
		.returning();

	return registro;
}
