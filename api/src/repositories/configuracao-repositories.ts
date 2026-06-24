import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type {
	ConfiguracaoImpressao,
	ConfiguracaoIntegracao,
	ConfiguracaoNotificacoes,
	ConfiguracaoRelatorios,
	NovaConfiguracao,
} from "@/model/configuracao-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function buscarConfiguracaoPorEmpresa({
	idempresa,
}: {
	idempresa: string;
}) {
	const [configuracao] = await db
		.select()
		.from(schema.configuracoes)
		.where(eq(schema.configuracoes.idempresa, idempresa))
		.limit(1);

	return configuracao;
}

export async function criarConfiguracao(dados: NovaConfiguracao) {
	const [configuracao] = await db
		.insert(schema.configuracoes)
		.values({
			id: randomUUID(),
			idempresa: dados.idempresa,
			criadoem: new Date().toISOString(),
			atualizadoem: new Date().toISOString(),
			notificacoes: dados.notificacoes ?? {},
			integracao: dados.integracao ?? {},
			relatorios: dados.relatorios ?? {},
			impressao: dados.impressao ?? {},
		} as typeof schema.configuracoes.$inferInsert)
		.returning();

	return configuracao;
}

export async function atualizarConfiguracao({
	id,
	dados,
}: {
	id: string;
	dados: Partial<NovaConfiguracao>;
}) {
	const updateData: Record<string, unknown> = {
		atualizadoem: new Date().toISOString(),
	};

	if (dados.notificacoes) {
		updateData.notificacoes = sql`COALESCE(${schema.configuracoes.notificacoes}, '{}'::jsonb) || ${JSON.stringify(dados.notificacoes)}::jsonb`;
	}

	if (dados.integracao) {
		updateData.integracao = sql`COALESCE(${schema.configuracoes.integracao}, '{}'::jsonb) || ${JSON.stringify(dados.integracao)}::jsonb`;
	}

	if (dados.relatorios) {
		updateData.relatorios = sql`COALESCE(${schema.configuracoes.relatorios}, '{}'::jsonb) || ${JSON.stringify(dados.relatorios)}::jsonb`;
	}

	if (dados.impressao) {
		updateData.impressao = sql`COALESCE(${schema.configuracoes.impressao}, '{}'::jsonb) || ${JSON.stringify(dados.impressao)}::jsonb`;
	}

	const [configuracao] = await db
		.update(schema.configuracoes)
		.set(updateData)
		.where(eq(schema.configuracoes.id, id))
		.returning();

	return configuracao;
}

export async function atualizarConfiguracaoParcial({
	idempresa,
	secao,
	dados,
	substituir = false,
}: {
	idempresa: string;
	secao: "notificacoes" | "integracao" | "relatorios" | "impressao";
	dados:
		| Partial<ConfiguracaoNotificacoes>
		| Partial<ConfiguracaoIntegracao>
		| Partial<ConfiguracaoRelatorios>
		| Partial<ConfiguracaoImpressao>;
	substituir?: boolean;
}) {
	const coluna = schema.configuracoes[secao];
	const valorColuna = substituir
		? dados
		: sql`COALESCE(${coluna}, '{}'::jsonb) || ${JSON.stringify(dados)}::jsonb`;

	const [configuracao] = await db
		.update(schema.configuracoes)
		.set({
			[secao]: valorColuna,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(schema.configuracoes.idempresa, idempresa))
		.returning();

	return configuracao;
}
