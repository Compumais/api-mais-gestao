import { eq } from "drizzle-orm";
import { configuracaoemailsmtp } from "@/repositories/schema.js";
import { db } from "./connection";

export type ConfiguracaoEmailSmtp =
	typeof configuracaoemailsmtp.$inferSelect;
export type NovaConfiguracaoEmailSmtp =
	typeof configuracaoemailsmtp.$inferInsert;

export async function buscarConfiguracaoEmailSmtpPorEmpresa(
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(configuracaoemailsmtp)
		.where(eq(configuracaoemailsmtp.idempresa, idempresa));

	return registro;
}

export async function criarConfiguracaoEmailSmtp(
	dados: NovaConfiguracaoEmailSmtp,
) {
	const [registro] = await db
		.insert(configuracaoemailsmtp)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarConfiguracaoEmailSmtp(
	id: string,
	dados: Partial<NovaConfiguracaoEmailSmtp>,
) {
	const [registro] = await db
		.update(configuracaoemailsmtp)
		.set(dados)
		.where(eq(configuracaoemailsmtp.id, id))
		.returning();

	return registro;
}
