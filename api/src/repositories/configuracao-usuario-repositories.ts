import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import type { PreferenciasUiUsuario } from "../../drizzle/tables/configuracoes-usuario.js";
import { db } from "./connection.js";

export type { PreferenciasUiUsuario };

export interface IntegracoesUsuario {
	geminiApiKey?: string | null;
	openaiApiKey?: string | null;
	openrouterApiKey?: string | null;
	asaasToken?: string | null;
	provedorPreferido?: "auto" | "openai" | "gemini" | "openrouter" | null;
	modeloOpenai?: string | null;
	modeloGemini?: string | null;
	modeloOpenrouter?: string | null;
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
				"provedorPreferido",
				"modeloOpenai",
				"modeloGemini",
				"modeloOpenrouter",
			] as const
		)
			.filter((k) => dados[k] != null && String(dados[k]).trim() !== "")
			.map((k) => [k, String(dados[k])]),
	);
}

export interface ConfiguracaoUsuario {
	id: string;
	idusuario: string;
	integracoes: IntegracoesUsuario;
	preferenciasui?: PreferenciasUiUsuario;
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
			preferenciasui: {},
			atualizadoem: new Date().toISOString(),
		})
		.returning();

	return configuracao;
}

function mesclarPreferenciasUi(
	atual: PreferenciasUiUsuario | null | undefined,
	parcial: PreferenciasUiUsuario,
): PreferenciasUiUsuario {
	const colunasTabelasAtual = atual?.colunasTabelas ?? {};
	const colunasTabelasParcial = parcial.colunasTabelas ?? {};
	const colunasTabelas: Record<string, Record<string, boolean>> = {
		...colunasTabelasAtual,
	};

	for (const [tabela, colunas] of Object.entries(colunasTabelasParcial)) {
		colunasTabelas[tabela] = {
			...(colunasTabelasAtual[tabela] ?? {}),
			...colunas,
		};
	}

	return {
		colunasTabelas,
		...(parcial.layoutMenu !== undefined
			? { layoutMenu: parcial.layoutMenu }
			: atual?.layoutMenu !== undefined
				? { layoutMenu: atual.layoutMenu }
				: {}),
	};
}

export async function criarOuAtualizarPreferenciasUiUsuario(
	idusuario: string,
	dados: PreferenciasUiUsuario,
) {
	const configuracaoExistente = await buscarConfiguracaoUsuario(idusuario);
	const preferenciasMescladas = mesclarPreferenciasUi(
		configuracaoExistente?.preferenciasui,
		dados,
	);

	if (configuracaoExistente) {
		const [configuracao] = await db
			.update(schema.configuracoesUsuario)
			.set({
				preferenciasui: preferenciasMescladas,
				atualizadoem: new Date().toISOString(),
			})
			.where(eq(schema.configuracoesUsuario.idusuario, idusuario))
			.returning();

		return configuracao;
	}

	const [configuracao] = await db
		.insert(schema.configuracoesUsuario)
		.values({
			id: randomUUID(),
			idusuario,
			criadoem: new Date().toISOString(),
			integracoes: {},
			preferenciasui: preferenciasMescladas,
			atualizadoem: new Date().toISOString(),
		})
		.returning();

	return configuracao;
}
