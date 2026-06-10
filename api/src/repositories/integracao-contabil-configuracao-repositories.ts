import { and, count, desc, eq } from "drizzle-orm";
import type { NovoIntegracaoContabilConfiguracao } from "@/model/integracao-contabil-configuracao-model";
import { integracaocontabilconfiguracao } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarIntegracaoContabilConfiguracaoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(integracaocontabilconfiguracao)
		.where(eq(integracaocontabilconfiguracao.id, id));

	return registro;
}

export async function criarIntegracaoContabilConfiguracao(
	dadosIntegracaoContabilConfiguracao: NovoIntegracaoContabilConfiguracao,
) {
	const [registro] = await db
		.insert(integracaocontabilconfiguracao)
		.values(dadosIntegracaoContabilConfiguracao)
		.returning();

	return registro;
}

export async function atualizarIntegracaoContabilConfiguracao(
	id: string,
	dadosIntegracaoContabilConfiguracao: Partial<NovoIntegracaoContabilConfiguracao>,
) {
	const [registro] = await db
		.update(integracaocontabilconfiguracao)
		.set(dadosIntegracaoContabilConfiguracao)
		.where(eq(integracaocontabilconfiguracao.id, id))
		.returning();

	return registro;
}

export async function excluirIntegracaoContabilConfiguracao(id: string) {
	const [registro] = await db
		.delete(integracaocontabilconfiguracao)
		.where(eq(integracaocontabilconfiguracao.id, id))
		.returning();

	return registro;
}

export type ListarIntegracoesContabilConfiguracaoParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
};

export async function listarIntegracoesContabilConfiguracao({
	idempresa,
	page = 1,
	limit = 10,
}: ListarIntegracoesContabilConfiguracaoParametros) {
	const where = [];

	where.push(eq(integracaocontabilconfiguracao.idempresa, idempresa));

	const offset = (page - 1) * limit;

	const [totalCount, integracoescontabilconfiguracao] = await Promise.all([
		db
			.select({ value: count() })
			.from(integracaocontabilconfiguracao)
			.where(and(...where)),
		db
			.select()
			.from(integracaocontabilconfiguracao)
			.where(and(...where))
			.orderBy(desc(integracaocontabilconfiguracao.currenttimemillis))
			.limit(limit)
			.offset(offset),
	]);

	return {
		integracoescontabilconfiguracao,
		total: totalCount[0]?.value ?? 0,
	};
}
