import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function buscarConfigFinanceiroEmpresa(idempresa: string) {
	const [config] = await db
		.select()
		.from(schema.configfinanceiroempresa)
		.where(eq(schema.configfinanceiroempresa.idempresa, idempresa));
	return config ?? null;
}

export async function upsertConfigFinanceiroEmpresa(
	dados: typeof schema.configfinanceiroempresa.$inferInsert,
) {
	const existente = await buscarConfigFinanceiroEmpresa(dados.idempresa);
	if (existente) {
		const [atualizado] = await db
			.update(schema.configfinanceiroempresa)
			.set({
				competenciadataref: dados.competenciadataref,
				percentualtoleranciaorcamentocc:
					dados.percentualtoleranciaorcamentocc,
				bloqueardespesaacimaorcamento: dados.bloqueardespesaacimaorcamento,
				currenttimemillis: dados.currenttimemillis,
				dataultimaalteracao: new Date().toISOString(),
			})
			.where(eq(schema.configfinanceiroempresa.id, existente.id))
			.returning();
		return atualizado;
	}
	const [criado] = await db
		.insert(schema.configfinanceiroempresa)
		.values(dados)
		.returning();
	return criado;
}
