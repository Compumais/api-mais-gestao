import { randomUUID } from "node:crypto";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type Notificacao = typeof schema.notificacoes.$inferSelect;
export type NovaNotificacao = typeof schema.notificacoes.$inferInsert;

export async function criarNotificacao(
	dados: NovaNotificacao,
): Promise<Notificacao | undefined> {
	const id = dados.id ?? randomUUID();
	const [notificacao] = await db
		.insert(schema.notificacoes)
		.values({ ...dados, id })
		.returning();

	return notificacao;
}

/**
 * Verifica se já existe notificação para o mesmo destinatário + tipo + recurso
 * (evita duplicata do mesmo evento, lida ou não).
 */
export async function existeNotificacaoParaRecurso(
	idusuario: string,
	tipo: string,
	idrecurso: string | null,
): Promise<boolean> {
	const [row] = await db
		.select({ value: count() })
		.from(schema.notificacoes)
		.where(
			and(
				eq(schema.notificacoes.idusuario, idusuario),
				eq(schema.notificacoes.tipo, tipo),
				idrecurso != null
					? eq(schema.notificacoes.idrecurso, idrecurso)
					: isNull(schema.notificacoes.idrecurso),
			),
		);

	return (row?.value ?? 0) > 0;
}

export type ListarNotificacoesParams = {
	idusuario: string;
	idempresa?: string | undefined;
	lida?: boolean | undefined;
	limit?: number;
	offset?: number;
};

export async function listarNotificacoes({
	idusuario,
	idempresa,
	lida,
	limit = 20,
	offset = 0,
}: ListarNotificacoesParams) {
	const conditions = [eq(schema.notificacoes.idusuario, idusuario)];

	if (idempresa != null) {
		conditions.push(eq(schema.notificacoes.idempresa, idempresa));
	}

	if (lida !== undefined) {
		conditions.push(eq(schema.notificacoes.lida, lida));
	}

	const [notificacoes, totalResult] = await Promise.all([
		db
			.select()
			.from(schema.notificacoes)
			.where(and(...conditions))
			.orderBy(desc(schema.notificacoes.criadoem))
			.limit(limit)
			.offset(offset),
		db
			.select({ value: count() })
			.from(schema.notificacoes)
			.where(and(...conditions)),
	]);

	return {
		notificacoes,
		total: totalResult[0]?.value ?? 0,
	};
}

export async function contarNaoLidas(idusuario: string): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(schema.notificacoes)
		.where(
			and(
				eq(schema.notificacoes.idusuario, idusuario),
				eq(schema.notificacoes.lida, false),
			),
		);

	return row?.value ?? 0;
}

export async function marcarComoLida(
	id: string,
	idusuario: string,
): Promise<Notificacao | undefined> {
	const [notificacao] = await db
		.update(schema.notificacoes)
		.set({ lida: true })
		.where(
			and(
				eq(schema.notificacoes.id, id),
				eq(schema.notificacoes.idusuario, idusuario),
			),
		)
		.returning();

	return notificacao;
}

export async function buscarNotificacaoPorId(
	id: string,
	idusuario: string,
): Promise<Notificacao | undefined> {
	const [notificacao] = await db
		.select()
		.from(schema.notificacoes)
		.where(
			and(
				eq(schema.notificacoes.id, id),
				eq(schema.notificacoes.idusuario, idusuario),
			),
		);

	return notificacao;
}
