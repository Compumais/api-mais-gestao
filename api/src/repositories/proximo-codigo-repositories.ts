import { eq, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function buscarProximoCodigoProduto(idempresa: string): Promise<number> {
	const [resultado] = await db
		.select({
			proximo: sql<number>`COALESCE(MAX(${schema.produtos.codigo}), 0) + 1`,
		})
		.from(schema.produtos)
		.where(eq(schema.produtos.idempresa, idempresa));

	return resultado?.proximo ?? 1;
}

export async function buscarProximoCodigoContaCorrente(
	idempresa: string,
): Promise<number> {
	const [resultado] = await db
		.select({
			proximo: sql<number>`COALESCE(MAX(${schema.contacorrente.codigo}), 0) + 1`,
		})
		.from(schema.contacorrente)
		.where(eq(schema.contacorrente.idempresa, idempresa));

	return Number(resultado?.proximo ?? 1);
}

export async function buscarProximoCodigoDav(idempresa: string): Promise<number> {
	const [resultado] = await db
		.select({
			proximo: sql<number>`COALESCE(MAX(${schema.dav.codigo}), 0) + 1`,
		})
		.from(schema.dav)
		.where(eq(schema.dav.idempresa, idempresa));

	return Number(resultado?.proximo ?? 1);
}

async function buscarProximoCodigoVarcharNumerico(
	tabela:
		| typeof schema.hierarquia
		| typeof schema.banco
		| typeof schema.unidademedida
		| typeof schema.condicaopagamento,
	idempresa: string,
): Promise<string> {
	const [resultado] = await db
		.select({
			proximo: sql<number>`COALESCE(
				MAX(CAST(${tabela.codigo} AS INTEGER)) FILTER (WHERE ${tabela.codigo} ~ '^[0-9]+$'),
				0
			) + 1`,
		})
		.from(tabela)
		.where(eq(tabela.idempresa, idempresa));

	return String(resultado?.proximo ?? 1);
}

export async function buscarProximoCodigoHierarquia(
	idempresa: string,
): Promise<string> {
	return buscarProximoCodigoVarcharNumerico(schema.hierarquia, idempresa);
}

export async function buscarProximoCodigoBanco(idempresa: string): Promise<string> {
	return buscarProximoCodigoVarcharNumerico(schema.banco, idempresa);
}

export async function buscarProximoCodigoUnidadeMedida(
	idempresa: string,
): Promise<string> {
	return buscarProximoCodigoVarcharNumerico(schema.unidademedida, idempresa);
}

export async function buscarProximoCodigoCondicaoPagamento(
	idempresa: string,
): Promise<string> {
	return buscarProximoCodigoVarcharNumerico(schema.condicaopagamento, idempresa);
}
