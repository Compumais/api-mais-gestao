import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { TipoTarefaExecucao } from "@/worker/types.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type TarefaExecucao = typeof schema.tarefaExecucao.$inferSelect;

export async function registrarInicioExecucao({
	tipo,
	idempresa,
}: {
	tipo: TipoTarefaExecucao;
	idempresa?: string | null;
}): Promise<string> {
	const id = randomUUID();
	const agora = new Date().toISOString();

	await db.insert(schema.tarefaExecucao).values({
		id,
		tipo,
		idempresa: idempresa ?? null,
		status: "executando",
		iniciadoem: agora,
	});

	return id;
}

export async function finalizarExecucao({
	id,
	status,
	detalhes,
	erro,
}: {
	id: string;
	status: "sucesso" | "erro" | "ignorado";
	detalhes?: Record<string, unknown>;
	erro?: string;
}) {
	await db
		.update(schema.tarefaExecucao)
		.set({
			status,
			finalizadoem: new Date().toISOString(),
			detalhes: detalhes ?? null,
			erro: erro ?? null,
		})
		.where(eq(schema.tarefaExecucao.id, id));
}

export type ListarExecucoesParams = {
	tipo?: TipoTarefaExecucao;
	idempresa?: string;
	limit?: number;
};

export async function listarExecucoesTarefas({
	tipo,
	idempresa,
	limit = 20,
}: ListarExecucoesParams): Promise<TarefaExecucao[]> {
	const conditions = [];

	if (tipo) {
		conditions.push(eq(schema.tarefaExecucao.tipo, tipo));
	}

	if (idempresa) {
		conditions.push(eq(schema.tarefaExecucao.idempresa, idempresa));
	}

	return db
		.select()
		.from(schema.tarefaExecucao)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(desc(schema.tarefaExecucao.iniciadoem))
		.limit(limit);
}

export async function obterUltimaExecucao({
	tipo,
	idempresa,
}: {
	tipo: TipoTarefaExecucao;
	idempresa?: string;
}): Promise<TarefaExecucao | undefined> {
	const [execucao] = await listarExecucoesTarefas({
		tipo,
		limit: 1,
		...(idempresa && { idempresa }),
	});

	return execucao;
}

export async function tentarAdquirirLockAgendador(
	lockId: number,
): Promise<boolean> {
	const result = await db.execute(
		sql`SELECT pg_try_advisory_lock(${lockId}) as locked`,
	);
	const rows = (result.rows ?? result) as { locked: boolean }[];
	return rows[0]?.locked === true;
}

export async function liberarLockAgendador(lockId: number): Promise<void> {
	await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
}
