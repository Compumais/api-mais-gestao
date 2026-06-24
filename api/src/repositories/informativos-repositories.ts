import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, ne, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type Informativo = typeof schema.informativos.$inferSelect;

export async function listarInformativos({
	publicado,
	limit = 50,
}: {
	publicado?: boolean;
	limit?: number;
} = {}) {
	const conditions = [];
	if (publicado !== undefined) {
		conditions.push(eq(schema.informativos.publicado, publicado));
	}

	return db
		.select()
		.from(schema.informativos)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(desc(schema.informativos.publicadoem))
		.limit(limit);
}

export async function buscarInformativoPorId(id: string) {
	const [informativo] = await db
		.select()
		.from(schema.informativos)
		.where(eq(schema.informativos.id, id))
		.limit(1);

	return informativo;
}

export async function criarInformativo(dados: {
	titulo: string;
	conteudo: string;
	publicado?: boolean;
}) {
	const agora = new Date().toISOString();
	const [informativo] = await db
		.insert(schema.informativos)
		.values({
			id: randomUUID(),
			titulo: dados.titulo,
			conteudo: dados.conteudo,
			publicado: dados.publicado ?? true,
			publicadoem: agora,
			criadoem: agora,
			atualizadoem: agora,
		})
		.returning();

	return informativo;
}

export async function atualizarInformativo(
	id: string,
	dados: Partial<{
		titulo: string;
		conteudo: string;
		publicado: boolean;
	}>,
) {
	const updateData: Record<string, unknown> = {
		atualizadoem: new Date().toISOString(),
	};

	if (dados.titulo !== undefined) updateData.titulo = dados.titulo;
	if (dados.conteudo !== undefined) updateData.conteudo = dados.conteudo;
	if (dados.publicado !== undefined) {
		updateData.publicado = dados.publicado;
		if (dados.publicado) {
			updateData.publicadoem = new Date().toISOString();
		}
	}

	const [informativo] = await db
		.update(schema.informativos)
		.set(updateData)
		.where(eq(schema.informativos.id, id))
		.returning();

	return informativo;
}

export async function excluirInformativo(id: string) {
	const [informativo] = await db
		.delete(schema.informativos)
		.where(eq(schema.informativos.id, id))
		.returning();

	return informativo;
}

export async function listarInformativosPublicados(limit = 10) {
	return listarInformativos({ publicado: true, limit });
}
