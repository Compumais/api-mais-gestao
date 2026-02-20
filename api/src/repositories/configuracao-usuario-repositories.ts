import { eq, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export interface IntegracoesUsuario {
	geminiApiKey?: string;
	openaiApiKey?: string;
	openrouterApiKey?: string;
	asaasToken?: string;
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
			id: crypto.randomUUID(),
			idusuario,
			integracoes: dados,
			atualizadoem: new Date().toISOString(),
		})
		.returning();

	return configuracao;
}

