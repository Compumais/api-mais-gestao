import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export interface IntegracoesUsuario {
	geminiApiKey?: string | null;
	openaiApiKey?: string | null;
	openrouterApiKey?: string | null;
	asaasToken?: string | null;
}

/** Objeto sem nulls para insert/update no schema (exactOptionalPropertyTypes). */
function integracoesParaJsonb(
	dados: IntegracoesUsuario,
): Record<string, string> {
	return Object.fromEntries(
		(
			[
				"geminiApiKey",
				"openaiApiKey",
				"openrouterApiKey",
				"asaasToken",
			] as const
		)
			.filter((k) => dados[k] != null)
			.map((k) => [k, dados[k] as string]),
	);
}

export interface ConfiguracaoUsuario {
	id: string;
	idusuario: string;
	integracoes: IntegracoesUsuario;
	criadoem: string;
	atualizadoem: string;
}

export async function buscarConfiguracaoUsuario(idusuario: string) {
	const [configuracao] = await db
		.select()
		.from(schema.configuracoesUsuario)
		.where(eq(schema.configuracoesUsuario.idusuario, idusuario))
		.limit(1);

	return configuracao;
}

export async function criarOuAtualizarConfiguracaoUsuario(
	idusuario: string,
	dados: IntegracoesUsuario,
) {
	// Verificar se já existe configuração para o usuário
	const configuracaoExistente = await buscarConfiguracaoUsuario(idusuario);

	if (configuracaoExistente) {
		// Atualizar configuração existente
		const [configuracao] = await db
			.update(schema.configuracoesUsuario)
			.set({
				integracoes: sql`COALESCE(${schema.configuracoesUsuario.integracoes}, '{}'::jsonb) || ${JSON.stringify(dados)}::jsonb`,
				atualizadoem: new Date().toISOString(),
			})
			.where(eq(schema.configuracoesUsuario.idusuario, idusuario))
			.returning();

		return configuracao;
	}

	// Criar nova configuração
	const [configuracao] = await db
		.insert(schema.configuracoesUsuario)
		.values({
			id: randomUUID(),
			idusuario,
			criadoem: new Date().toISOString(),
			integracoes: integracoesParaJsonb(dados),
			atualizadoem: new Date().toISOString(),
		})
		.returning();

	return configuracao;
}
