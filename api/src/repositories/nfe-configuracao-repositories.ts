import { eq } from "drizzle-orm";
import { nfeconfiguracao } from "@/repositories/schema.js";
import { db } from "./connection";

export type NfeConfiguracao = typeof nfeconfiguracao.$inferSelect;
export type NovaNfeConfiguracao = typeof nfeconfiguracao.$inferInsert;

export async function buscarNfeConfiguracaoPorEmpresa(idempresa: string) {
	const [registro] = await db
		.select()
		.from(nfeconfiguracao)
		.where(eq(nfeconfiguracao.idempresa, idempresa));

	return registro;
}

export async function criarNfeConfiguracao(dados: NovaNfeConfiguracao) {
	const [registro] = await db
		.insert(nfeconfiguracao)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarNfeConfiguracao(
	id: string,
	dados: Partial<NovaNfeConfiguracao>,
) {
	const [registro] = await db
		.update(nfeconfiguracao)
		.set(dados)
		.where(eq(nfeconfiguracao.id, id))
		.returning();

	return registro;
}
