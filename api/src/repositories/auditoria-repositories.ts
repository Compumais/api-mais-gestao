import { and, count, desc, eq } from "drizzle-orm";
import type { NovaAuditoria } from "@/model/auditoria-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

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
	idempresa?: string;
};

export async function listarAuditorias({
	idempresa,
	limit = 100,
	page = 1,
}: ListarAuditoriasParams) {
	const where = [];

	if (idempresa) {
		where.push(eq(schema.auditLogs.idempresa, idempresa));
	}

	const offset = (page - 1) * limit;

	const [totalCount, auditorias] = await Promise.all([
		db
			.select({ count: count() })
			.from(schema.auditLogs)
			.where(and(...where)),
		db
			.select({
				id: schema.auditLogs.id,
				acao: schema.auditLogs.acao,
				recurso: schema.auditLogs.recurso,
				idrecurso: schema.auditLogs.idrecurso,
				idusuario: schema.auditLogs.idusuario,
				idempresa: schema.auditLogs.idempresa,
				metadados: schema.auditLogs.metadados,
				criadoem: schema.auditLogs.criadoem,
				nomeusuario: schema.usuarios.nome,
				nomeempresa: schema.empresa.nome,
			})
			.from(schema.auditLogs)
			.leftJoin(
				schema.usuarios,
				eq(schema.auditLogs.idusuario, schema.usuarios.id),
			)
			.leftJoin(
				schema.empresa,
				eq(schema.auditLogs.idempresa, schema.empresa.id),
			)
			.where(and(...where))
			.orderBy(desc(schema.auditLogs.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		totalCount: totalCount[0]?.count ?? 0,
		auditorias,
	};
}
