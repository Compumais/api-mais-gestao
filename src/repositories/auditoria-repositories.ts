import { and, count, desc, eq } from "drizzle-orm";
import type { NovaAuditoria } from "@/model/auditoria-model";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection";

export async function criarAuditoria(dadosAuditoria: NovaAuditoria) {
	const [auditoria] = await db
		.insert(schema.auditLogs)
		.values(dadosAuditoria)
		.returning();

	return auditoria;
}

export async function excluirAuditoria({ id }: { id: string }) {
	const [auditoria] = await db
		.delete(schema.auditLogs)
		.where(eq(schema.auditLogs.id, id))
		.returning();

	return auditoria;
}

type ListarAuditoriasParams = {
	page?: number;
	limit?: number;
	empresaId?: string;
};

export async function listarAuditorias({
	empresaId,
	limit = 100,
	page = 1,
}: ListarAuditoriasParams) {
	const where = [];

	if (empresaId) {
		where.push(eq(schema.auditLogs.empresaId, empresaId));
	}

	const offset = (page - 1) * limit;

	const [totalCount, auditorias] = await Promise.all([
		db
			.select({ count: count() })
			.from(schema.auditLogs)
			.where(and(...where)),
		db
			.select()
			.from(schema.auditLogs)
			.where(and(...where))
			.orderBy(desc(schema.auditLogs.criadoEm))
			.limit(limit)
			.offset(offset),
	]);

	return {
		totalCount: totalCount[0]?.count ?? 0,
		auditorias,
	};
}
