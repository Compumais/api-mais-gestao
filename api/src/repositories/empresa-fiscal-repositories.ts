import { eq } from "drizzle-orm";
import { empresafiscal } from "@/repositories/schema.js";
import { db } from "./connection";

export type EmpresaFiscal = typeof empresafiscal.$inferSelect;
export type NovaEmpresaFiscal = typeof empresafiscal.$inferInsert;

export async function buscarEmpresaFiscalPorEmpresa(idempresa: string) {
	const [registro] = await db
		.select()
		.from(empresafiscal)
		.where(eq(empresafiscal.idempresa, idempresa));

	return registro;
}

export async function criarEmpresaFiscal(dados: NovaEmpresaFiscal) {
	const [registro] = await db.insert(empresafiscal).values(dados).returning();
	return registro;
}

export async function atualizarEmpresaFiscal(
	id: string,
	dados: Partial<NovaEmpresaFiscal>,
) {
	const [registro] = await db
		.update(empresafiscal)
		.set(dados)
		.where(eq(empresafiscal.id, id))
		.returning();

	return registro;
}
