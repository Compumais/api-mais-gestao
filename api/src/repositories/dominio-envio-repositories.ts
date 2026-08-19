import { and, count, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import type {
	DominioEnvio,
	DominioEnvioListagem,
	DominioEnvioStatus,
	DominioEnvioTipo,
	NovoDominioEnvio,
} from "@/model/dominio-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type { DominioEnvio, NovoDominioEnvio };

export async function buscarDominioEnvioPorId(id: string) {
	const [registro] = await db
		.select()
		.from(schema.dominioenvio)
		.where(eq(schema.dominioenvio.id, id));

	return registro;
}

export async function buscarDominioEnvioPorNotaETipo(
	idnotafiscal: string,
	tipo: DominioEnvioTipo,
) {
	const [registro] = await db
		.select()
		.from(schema.dominioenvio)
		.where(
			and(
				eq(schema.dominioenvio.idnotafiscal, idnotafiscal),
				eq(schema.dominioenvio.tipo, tipo),
			),
		);

	return registro;
}

export async function criarDominioEnvio(dados: NovoDominioEnvio) {
	const [registro] = await db
		.insert(schema.dominioenvio)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarDominioEnvio(
	id: string,
	dados: Partial<NovoDominioEnvio>,
) {
	const [registro] = await db
		.update(schema.dominioenvio)
		.set(dados)
		.where(eq(schema.dominioenvio.id, id))
		.returning();

	return registro;
}

export async function reivindicarDominioEnvio(
	id: string,
	statusPermitidos: DominioEnvioStatus[],
	agora: string,
) {
	const [registro] = await db
		.update(schema.dominioenvio)
		.set({
			status: "enviando",
			atualizadoem: agora,
		})
		.where(
			and(
				eq(schema.dominioenvio.id, id),
				inArray(schema.dominioenvio.status, statusPermitidos),
			),
		)
		.returning();

	return registro;
}

export type ListarDominioEnviosParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
};

export async function listarDominioEnviosPorEmpresa({
	idempresa,
	page = 1,
	limit = 20,
}: ListarDominioEnviosParametros): Promise<{
	envios: DominioEnvioListagem[];
	total: number;
}> {
	const offset = (page - 1) * limit;
	const where = eq(schema.dominioenvio.idempresa, idempresa);

	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(schema.dominioenvio).where(where),
		db
			.select({
				id: schema.dominioenvio.id,
				idempresa: schema.dominioenvio.idempresa,
				idnotafiscal: schema.dominioenvio.idnotafiscal,
				tipo: schema.dominioenvio.tipo,
				status: schema.dominioenvio.status,
				idloteapi: schema.dominioenvio.idloteapi,
				tentativas: schema.dominioenvio.tentativas,
				proximatentativa: schema.dominioenvio.proximatentativa,
				mensagemretorno: schema.dominioenvio.mensagemretorno,
				criadoem: schema.dominioenvio.criadoem,
				atualizadoem: schema.dominioenvio.atualizadoem,
				chavenfe: schema.notafiscal.chavenfe,
				modelo: schema.notafiscal.modelo,
				numeronotafiscal: schema.notafiscal.numeronotafiscal,
			})
			.from(schema.dominioenvio)
			.leftJoin(
				schema.notafiscal,
				eq(schema.dominioenvio.idnotafiscal, schema.notafiscal.id),
			)
			.where(where)
			.orderBy(desc(schema.dominioenvio.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		envios: registros,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function listarDominioEnviosPendentes(agora: string, limite = 50) {
	return db
		.select()
		.from(schema.dominioenvio)
		.where(
			and(
				inArray(schema.dominioenvio.status, ["pendente", "erro"]),
				or(
					sql`${schema.dominioenvio.proximatentativa} IS NULL`,
					lte(schema.dominioenvio.proximatentativa, agora),
				),
			),
		)
		.orderBy(schema.dominioenvio.criadoem)
		.limit(limite);
}

export async function listarDominioEnviosAguardandoProcessamento(limite = 50) {
	return db
		.select()
		.from(schema.dominioenvio)
		.where(eq(schema.dominioenvio.status, "aguardando_processamento"))
		.orderBy(schema.dominioenvio.atualizadoem)
		.limit(limite);
}
