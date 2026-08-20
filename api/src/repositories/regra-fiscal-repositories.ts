import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { auditoriafiscalnfe, regrafiscal, regrafiscalhistorico } from "@/repositories/schema.js";
import type {
	CondicoesRegraFiscal,
	FontesRegraFiscal,
	ResultadoRegraFiscal,
	StatusRegraFiscal,
} from "@/model/regra-fiscal-model.js";
import { db } from "./connection";

export type RegraFiscal = typeof regrafiscal.$inferSelect;
export type NovaRegraFiscal = typeof regrafiscal.$inferInsert;
export type AuditoriaFiscalNfe = typeof auditoriafiscalnfe.$inferSelect;
export type NovaAuditoriaFiscalNfe = typeof auditoriafiscalnfe.$inferInsert;
export type RegraFiscalHistorico = typeof regrafiscalhistorico.$inferSelect;

export async function listarRegrasFiscais(params: {
	busca?: string | undefined;
	status?: string | undefined;
	page?: number;
	limit?: number;
}) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 20;
	const where = [];

	if (params.status) {
		where.push(eq(regrafiscal.status, params.status));
	}
	if (params.busca) {
		where.push(
			or(
				ilike(regrafiscal.ruleid, `%${params.busca}%`),
				ilike(regrafiscal.descricao, `%${params.busca}%`),
			) ?? sql`true`,
		);
	}

	const filtro = where.length > 0 ? and(...where) : undefined;
	const offset = (page - 1) * limit;

	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(regrafiscal).where(filtro),
		db
			.select()
			.from(regrafiscal)
			.where(filtro)
			.orderBy(desc(regrafiscal.prioridade), desc(regrafiscal.atualizadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		registros,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function listarRegrasFiscaisValidas() {
	return db
		.select()
		.from(regrafiscal)
		.where(eq(regrafiscal.status, "validado"));
}

export async function buscarRegraFiscalPorId(id: string) {
	const [registro] = await db
		.select()
		.from(regrafiscal)
		.where(eq(regrafiscal.id, id));
	return registro;
}

export async function buscarRegraFiscalPorRuleId(ruleId: string) {
	const [registro] = await db
		.select()
		.from(regrafiscal)
		.where(eq(regrafiscal.ruleid, ruleId));
	return registro;
}

export async function criarRegraFiscal(dados: NovaRegraFiscal) {
	const [registro] = await db.insert(regrafiscal).values(dados).returning();
	return registro;
}

export async function atualizarRegraFiscal(
	id: string,
	dados: Partial<NovaRegraFiscal>,
) {
	const [registro] = await db
		.update(regrafiscal)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(regrafiscal.id, id))
		.returning();
	return registro;
}

export async function criarHistoricoRegraFiscal(dados: {
	id: string;
	idregrafiscal: string;
	versao: number;
	snapshot: unknown;
	idusuario?: string | null;
}) {
	const [registro] = await db
		.insert(regrafiscalhistorico)
		.values({
			id: dados.id,
			idregrafiscal: dados.idregrafiscal,
			versao: dados.versao,
			snapshot: dados.snapshot,
			idusuario: dados.idusuario ?? null,
		})
		.returning();
	return registro;
}

export async function buscarHistoricoRegraFiscal(
	idregrafiscal: string,
	versao: number,
) {
	const [registro] = await db
		.select()
		.from(regrafiscalhistorico)
		.where(
			and(
				eq(regrafiscalhistorico.idregrafiscal, idregrafiscal),
				eq(regrafiscalhistorico.versao, versao),
			),
		);
	return registro;
}

export async function listarHistoricoRegraFiscal(idregrafiscal: string) {
	return db
		.select()
		.from(regrafiscalhistorico)
		.where(eq(regrafiscalhistorico.idregrafiscal, idregrafiscal))
		.orderBy(desc(regrafiscalhistorico.versao));
}

export async function criarAuditoriaFiscalNfe(dados: NovaAuditoriaFiscalNfe) {
	const [registro] = await db
		.insert(auditoriafiscalnfe)
		.values(dados)
		.returning();
	return registro;
}

export function condicoesRegraFiscal(
	valor: unknown,
): CondicoesRegraFiscal {
	if (!valor || typeof valor !== "object") return {};
	return valor as CondicoesRegraFiscal;
}

export function resultadoRegraFiscal(
	valor: unknown,
): ResultadoRegraFiscal {
	if (!valor || typeof valor !== "object") return {};
	return valor as ResultadoRegraFiscal;
}

export function fontesRegraFiscal(valor: unknown): FontesRegraFiscal {
	return Array.isArray(valor) ? (valor as FontesRegraFiscal) : [];
}

export function statusRegraFiscal(valor: string): StatusRegraFiscal {
	return valor as StatusRegraFiscal;
}
