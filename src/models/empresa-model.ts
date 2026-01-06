import { and, desc, eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type Empresa = typeof schema.empresa.$inferSelect;
export type NovaEmpresa = typeof schema.empresa.$inferInsert;

export async function criarEmpresa(dadosEmpresa: NovaEmpresa) {
	const empresa = await db
		.insert(schema.empresa)
		.values(dadosEmpresa)
		.returning();

	return empresa;
}

export type ListarEmpresasParametros = {
	proprietarioId?: string | null;
};

export async function listarEmpresas({
	proprietarioId,
}: ListarEmpresasParametros) {
	const where = [];
	if (proprietarioId) {
		where.push(eq(schema.empresa.proprietarioId, proprietarioId));
	}

	const empresas = await db
		.select()
		.from(schema.empresa)
		.where(and(...where))
		.orderBy(desc(schema.empresa.criadoEm))
		.limit(10)
		.offset(0);

	return empresas;
}
