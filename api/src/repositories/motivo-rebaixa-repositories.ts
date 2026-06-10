import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoMotivoRebaixa } from "@/model/motivo-rebaixa-model";
import { motivorebaixa } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarMotivoRebaixaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(motivorebaixa)
		.where(eq(motivorebaixa.id, id));

	return registro;
}

export async function criarMotivoRebaixa(
	dadosMotivoRebaixa: NovoMotivoRebaixa,
) {
	const [registro] = await db
		.insert(motivorebaixa)
		.values(dadosMotivoRebaixa)
		.returning();

	return registro;
}

export async function atualizarMotivoRebaixa(
	id: string,
	dadosMotivoRebaixa: Partial<NovoMotivoRebaixa>,
) {
	const [registro] = await db
		.update(motivorebaixa)
		.set(dadosMotivoRebaixa)
		.where(eq(motivorebaixa.id, id))
		.returning();

	return registro;
}

export async function excluirMotivoRebaixa(id: string) {
	const [registro] = await db
		.delete(motivorebaixa)
		.where(eq(motivorebaixa.id, id))
		.returning();

	return registro;
}

export type ListarMotivosRebaixaParametros = {
	idempresa: string;
	nome?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarMotivosRebaixa({
	idempresa,
	nome,
	inativo,
	page = 1,
	limit = 10,
}: ListarMotivosRebaixaParametros) {
	const where = [];

	where.push(eq(motivorebaixa.idempresa, idempresa));

	if (nome) {
		where.push(ilike(motivorebaixa.nome, `%${nome}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(motivorebaixa.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, motivorebaixas] = await Promise.all([
		db
			.select({ value: count() })
			.from(motivorebaixa)
			.where(and(...where)),
		db
			.select()
			.from(motivorebaixa)
			.where(and(...where))
			.orderBy(desc(motivorebaixa.nome))
			.limit(limit)
			.offset(offset),
	]);

	return {
		motivorebaixas,
		total: totalCount[0]?.value ?? 0,
	};
}
