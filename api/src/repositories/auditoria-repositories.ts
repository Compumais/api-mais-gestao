import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	ilike,
	lte,
	type SQL,
} from "drizzle-orm";
import type { NovaAuditoria } from "@/model/auditoria-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export const ORDENAR_AUDITORIA_CAMPOS = [
	"acao",
	"recurso",
	"nomeusuario",
	"criadoem",
	"idrecurso",
	"nomeempresa",
] as const;

export type OrdenarAuditoriaCampo = (typeof ORDENAR_AUDITORIA_CAMPOS)[number];

const COLUNAS_ORDENACAO_AUDITORIA = {
	acao: schema.auditLogs.acao,
	recurso: schema.auditLogs.recurso,
	nomeusuario: schema.usuarios.nome,
	criadoem: schema.auditLogs.criadoem,
	idrecurso: schema.auditLogs.idrecurso,
	nomeempresa: schema.empresa.nome,
} as const;

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

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

export type ListarAuditoriasParams = {
	page?: number;
	limit?: number;
	idempresa?: string;
	acao?: string | undefined;
	recurso?: string | undefined;
	idrecurso?: string | undefined;
	nomeusuario?: string | undefined;
	nomeempresa?: string | undefined;
	/** Dia único YYYY-MM-DD em `criadoem` */
	criadoem?: string | undefined;
	ordenarPor?: OrdenarAuditoriaCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
};

export async function listarAuditorias({
	idempresa,
	acao,
	recurso,
	idrecurso,
	nomeusuario,
	nomeempresa,
	criadoem,
	ordenarPor,
	ordem = "desc",
	limit = 100,
	page = 1,
}: ListarAuditoriasParams) {
	const where: SQL[] = [];

	if (idempresa) {
		where.push(eq(schema.auditLogs.idempresa, idempresa));
	}

	adicionarFiltroTexto(where, schema.auditLogs.acao, acao);
	adicionarFiltroTexto(where, schema.auditLogs.recurso, recurso);
	adicionarFiltroTexto(where, schema.auditLogs.idrecurso, idrecurso);
	adicionarFiltroTexto(where, schema.usuarios.nome, nomeusuario);
	adicionarFiltroTexto(where, schema.empresa.nome, nomeempresa);

	if (criadoem?.trim()) {
		const dia = criadoem.trim();
		where.push(
			and(
				gte(schema.auditLogs.criadoem, `${dia}T00:00:00.000`),
				lte(schema.auditLogs.criadoem, `${dia}T23:59:59.999`),
			)!,
		);
	}

	const offset = (page - 1) * limit;
	const orderBy =
		ordenarPor && COLUNAS_ORDENACAO_AUDITORIA[ordenarPor]
			? ordem === "asc"
				? asc(COLUNAS_ORDENACAO_AUDITORIA[ordenarPor])
				: desc(COLUNAS_ORDENACAO_AUDITORIA[ordenarPor])
			: desc(schema.auditLogs.criadoem);

	const filtro = where.length > 0 ? and(...where) : undefined;

	const joinUsuario = eq(schema.auditLogs.idusuario, schema.usuarios.id);
	const joinEmpresa = eq(schema.auditLogs.idempresa, schema.empresa.id);

	const [totalCount, auditorias] = await Promise.all([
		db
			.select({ count: count() })
			.from(schema.auditLogs)
			.leftJoin(schema.usuarios, joinUsuario)
			.leftJoin(schema.empresa, joinEmpresa)
			.where(filtro),
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
			.leftJoin(schema.usuarios, joinUsuario)
			.leftJoin(schema.empresa, joinEmpresa)
			.where(filtro)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
	]);

	return {
		totalCount: totalCount[0]?.count ?? 0,
		auditorias,
	};
}
