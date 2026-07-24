import { randomUUID } from "node:crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as schema from "../../drizzle/schema.js";
import { gerarSlug } from "@/util/gerar-slug.js";
import { db } from "./connection.js";

export type AjudaPost = typeof schema.ajudaposts.$inferSelect;

const autorAlias = alias(schema.usuarios, "autor_ajuda");
const editorAlias = alias(schema.usuarios, "editor_ajuda");

export type AjudaPostComAutores = AjudaPost & {
	autorNome: string | null;
	editorNome: string | null;
};

async function garantirSlugUnico(slugBase: string, excluirId?: string) {
	let slug = slugBase;
	let sufixo = 2;

	while (true) {
		const conditions = [eq(schema.ajudaposts.slug, slug)];
		if (excluirId) {
			conditions.push(ne(schema.ajudaposts.id, excluirId));
		}

		const [existente] = await db
			.select({ id: schema.ajudaposts.id })
			.from(schema.ajudaposts)
			.where(and(...conditions))
			.limit(1);

		if (!existente) {
			return slug;
		}

		slug = `${slugBase}-${sufixo}`;
		sufixo += 1;
	}
}

export async function listarAjudaPostsAdmin(): Promise<AjudaPostComAutores[]> {
	return db
		.select({
			id: schema.ajudaposts.id,
			titulo: schema.ajudaposts.titulo,
			subtitulo: schema.ajudaposts.subtitulo,
			descricao: schema.ajudaposts.descricao,
			capa: schema.ajudaposts.capa,
			imagens: schema.ajudaposts.imagens,
			slug: schema.ajudaposts.slug,
			publicado: schema.ajudaposts.publicado,
			autorid: schema.ajudaposts.autorid,
			editorid: schema.ajudaposts.editorid,
			criadoem: schema.ajudaposts.criadoem,
			atualizadoem: schema.ajudaposts.atualizadoem,
			autorNome: autorAlias.nome,
			editorNome: editorAlias.nome,
		})
		.from(schema.ajudaposts)
		.leftJoin(autorAlias, eq(schema.ajudaposts.autorid, autorAlias.id))
		.leftJoin(editorAlias, eq(schema.ajudaposts.editorid, editorAlias.id))
		.orderBy(desc(schema.ajudaposts.atualizadoem));
}

export async function listarAjudaPostsPublicados(
	limit = 100,
): Promise<AjudaPostComAutores[]> {
	return db
		.select({
			id: schema.ajudaposts.id,
			titulo: schema.ajudaposts.titulo,
			subtitulo: schema.ajudaposts.subtitulo,
			descricao: schema.ajudaposts.descricao,
			capa: schema.ajudaposts.capa,
			imagens: schema.ajudaposts.imagens,
			slug: schema.ajudaposts.slug,
			publicado: schema.ajudaposts.publicado,
			autorid: schema.ajudaposts.autorid,
			editorid: schema.ajudaposts.editorid,
			criadoem: schema.ajudaposts.criadoem,
			atualizadoem: schema.ajudaposts.atualizadoem,
			autorNome: autorAlias.nome,
			editorNome: editorAlias.nome,
		})
		.from(schema.ajudaposts)
		.leftJoin(autorAlias, eq(schema.ajudaposts.autorid, autorAlias.id))
		.leftJoin(editorAlias, eq(schema.ajudaposts.editorid, editorAlias.id))
		.where(eq(schema.ajudaposts.publicado, true))
		.orderBy(desc(schema.ajudaposts.atualizadoem))
		.limit(limit);
}

export async function buscarAjudaPostPorId(id: string) {
	const [post] = await db
		.select()
		.from(schema.ajudaposts)
		.where(eq(schema.ajudaposts.id, id))
		.limit(1);

	return post;
}

export async function buscarAjudaPostPublicadoPorSlug(slug: string) {
	const [post] = await db
		.select({
			id: schema.ajudaposts.id,
			titulo: schema.ajudaposts.titulo,
			subtitulo: schema.ajudaposts.subtitulo,
			descricao: schema.ajudaposts.descricao,
			capa: schema.ajudaposts.capa,
			imagens: schema.ajudaposts.imagens,
			slug: schema.ajudaposts.slug,
			publicado: schema.ajudaposts.publicado,
			autorid: schema.ajudaposts.autorid,
			editorid: schema.ajudaposts.editorid,
			criadoem: schema.ajudaposts.criadoem,
			atualizadoem: schema.ajudaposts.atualizadoem,
			autorNome: autorAlias.nome,
			editorNome: editorAlias.nome,
		})
		.from(schema.ajudaposts)
		.leftJoin(autorAlias, eq(schema.ajudaposts.autorid, autorAlias.id))
		.leftJoin(editorAlias, eq(schema.ajudaposts.editorid, editorAlias.id))
		.where(
			and(
				eq(schema.ajudaposts.slug, slug),
				eq(schema.ajudaposts.publicado, true),
			),
		)
		.limit(1);

	return post;
}

export async function criarAjudaPost(dados: {
	titulo: string;
	subtitulo?: string | null;
	descricao: string;
	capa?: string | null;
	imagens?: string[];
	publicado?: boolean;
	autorid: string;
}) {
	const agora = new Date().toISOString();
	const slug = await garantirSlugUnico(gerarSlug(dados.titulo));

	const [post] = await db
		.insert(schema.ajudaposts)
		.values({
			id: randomUUID(),
			titulo: dados.titulo,
			subtitulo: dados.subtitulo ?? null,
			descricao: dados.descricao,
			capa: dados.capa ?? null,
			imagens: dados.imagens ?? [],
			slug,
			publicado: dados.publicado ?? true,
			autorid: dados.autorid,
			editorid: dados.autorid,
			criadoem: agora,
			atualizadoem: agora,
		})
		.returning();

	return post;
}

export async function atualizarAjudaPost(
	id: string,
	dados: Partial<{
		titulo: string;
		subtitulo: string | null;
		descricao: string;
		capa: string | null;
		imagens: string[];
		publicado: boolean;
	}> & { editorid: string },
) {
	const updateData: Record<string, unknown> = {
		atualizadoem: new Date().toISOString(),
		editorid: dados.editorid,
	};

	if (dados.titulo !== undefined) {
		updateData.titulo = dados.titulo;
		updateData.slug = await garantirSlugUnico(gerarSlug(dados.titulo), id);
	}
	if (dados.subtitulo !== undefined) updateData.subtitulo = dados.subtitulo;
	if (dados.descricao !== undefined) updateData.descricao = dados.descricao;
	if (dados.capa !== undefined) updateData.capa = dados.capa;
	if (dados.imagens !== undefined) updateData.imagens = dados.imagens;
	if (dados.publicado !== undefined) updateData.publicado = dados.publicado;

	const [post] = await db
		.update(schema.ajudaposts)
		.set(updateData)
		.where(eq(schema.ajudaposts.id, id))
		.returning();

	return post;
}

export async function excluirAjudaPost(id: string) {
	const [post] = await db
		.delete(schema.ajudaposts)
		.where(eq(schema.ajudaposts.id, id))
		.returning();

	return post;
}
