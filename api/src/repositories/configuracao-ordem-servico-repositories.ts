import { eq } from "drizzle-orm";
import type { NovaConfiguracaoOrdemServico } from "@/model/configuracao-ordem-servico-model";
import { configuracaoordemservico } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarConfiguracaoOrdemServicoPorEmpresa(
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(configuracaoordemservico)
		.where(eq(configuracaoordemservico.idempresa, idempresa));

	return registro;
}

export async function criarConfiguracaoOrdemServico(
	dados: NovaConfiguracaoOrdemServico,
) {
	const [registro] = await db
		.insert(configuracaoordemservico)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarConfiguracaoOrdemServico(
	idempresa: string,
	dados: Partial<NovaConfiguracaoOrdemServico>,
) {
	const [registro] = await db
		.update(configuracaoordemservico)
		.set({
			...dados,
			dataalteracao: new Date().toISOString(),
		})
		.where(eq(configuracaoordemservico.idempresa, idempresa))
		.returning();

	return registro;
}
