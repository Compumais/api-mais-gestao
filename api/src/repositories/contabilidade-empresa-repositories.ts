import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type ContabilidadeEmpresa =
	typeof schema.contabilidadeempresa.$inferSelect;
export type NovaContabilidadeEmpresa =
	typeof schema.contabilidadeempresa.$inferInsert;

export async function buscarContabilidadePorEmpresa(idempresa: string) {
	const [registro] = await db
		.select()
		.from(schema.contabilidadeempresa)
		.where(eq(schema.contabilidadeempresa.idempresa, idempresa));

	return registro;
}

export async function criarContabilidadeEmpresa(
	dados: NovaContabilidadeEmpresa,
) {
	const [registro] = await db
		.insert(schema.contabilidadeempresa)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarContabilidadeEmpresa(
	id: string,
	dados: Partial<{
		nome: string;
		cnpj: string | null;
		emailprincipal: string;
		emailsadicionais: string[] | null;
		ativo: boolean;
		atualizadoem: string;
	}>,
) {
	const [registro] = await db
		.update(schema.contabilidadeempresa)
		.set(dados)
		.where(eq(schema.contabilidadeempresa.id, id))
		.returning();

	return registro;
}
