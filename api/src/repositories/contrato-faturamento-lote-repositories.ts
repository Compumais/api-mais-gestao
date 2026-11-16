import { and, count, desc, eq, type SQL } from "drizzle-orm";
import type { NovoContratoFaturamentoLote } from "@/model/contrato-model.js";
import { contratofaturamentolote } from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function criarContratoFaturamentoLote(
	dados: NovoContratoFaturamentoLote,
) {
	const [registro] = await db
		.insert(contratofaturamentolote)
		.values(dados)
		.returning();
	return registro;
}

export async function buscarContratoFaturamentoLotePorId(id: string) {
	const [registro] = await db
		.select()
		.from(contratofaturamentolote)
		.where(eq(contratofaturamentolote.id, id));
	return registro;
}

export async function buscarContratoFaturamentoLotePorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(contratofaturamentolote)
		.where(
			and(
				eq(contratofaturamentolote.id, id),
				eq(contratofaturamentolote.idempresa, idempresa),
			),
		);
	return registro;
}

export async function atualizarContratoFaturamentoLote(
	id: string,
	dados: Partial<NovoContratoFaturamentoLote>,
) {
	const [registro] = await db
		.update(contratofaturamentolote)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(contratofaturamentolote.id, id))
		.returning();
	return registro;
}

export type ListarLotesFaturamentoParametros = {
	idempresa: string;
	competencia?: string | undefined;
	status?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarContratoFaturamentoLotes({
	idempresa,
	competencia,
	status,
	page = 1,
	limit = 20,
}: ListarLotesFaturamentoParametros) {
	const where: SQL[] = [eq(contratofaturamentolote.idempresa, idempresa)];
	if (competencia?.trim()) {
		where.push(eq(contratofaturamentolote.competencia, competencia.trim()));
	}
	if (status?.trim()) {
		where.push(eq(contratofaturamentolote.status, status.trim()));
	}

	const offset = (page - 1) * limit;
	const [totalCount, lotes] = await Promise.all([
		db
			.select({ value: count() })
			.from(contratofaturamentolote)
			.where(and(...where)),
		db
			.select()
			.from(contratofaturamentolote)
			.where(and(...where))
			.orderBy(desc(contratofaturamentolote.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		lotes,
		total: totalCount[0]?.value ?? 0,
	};
}
