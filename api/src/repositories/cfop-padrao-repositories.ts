import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoCFOPPadrao } from "@/model/cfop-padrao-model";
import { cfoppadrao } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarCfopPadraoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(cfoppadrao)
		.where(eq(cfoppadrao.id, id));

	return registro;
}

export async function criarCfopPadrao(dadosCfopPadrao: NovoCFOPPadrao) {
	const [registro] = await db
		.insert(cfoppadrao)
		.values(dadosCfopPadrao)
		.returning();

	return registro;
}

export async function atualizarCfopPadrao(
	id: string,
	dadosCfopPadrao: Partial<NovoCFOPPadrao>,
) {
	const [registro] = await db
		.update(cfoppadrao)
		.set(dadosCfopPadrao)
		.where(eq(cfoppadrao.id, id))
		.returning();

	return registro;
}

export async function excluirCfopPadrao(id: string) {
	const [registro] = await db
		.delete(cfoppadrao)
		.where(eq(cfoppadrao.id, id))
		.returning();

	return registro;
}

export type ListarCfopsPadraoParametros = {
	idempresa: string;
	nome?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarCfopsPadrao({
	idempresa,
	nome,
	inativo,
	page = 1,
	limit = 10,
}: ListarCfopsPadraoParametros) {
	const where = [];

	where.push(eq(cfoppadrao.idempresa, idempresa));

	if (nome) {
		where.push(ilike(cfoppadrao.nome, `%${nome}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(cfoppadrao.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, cfoppadraos] = await Promise.all([
		db
			.select({ value: count() })
			.from(cfoppadrao)
			.where(and(...where)),
		db
			.select()
			.from(cfoppadrao)
			.where(and(...where))
			.orderBy(desc(cfoppadrao.nome))
			.limit(limit)
			.offset(offset),
	]);

	return {
		cfoppadraos,
		total: totalCount[0]?.value ?? 0,
	};
}
