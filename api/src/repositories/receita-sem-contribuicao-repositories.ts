import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoReceitaSemContribuicao } from "@/model/receita-sem-contribuicao-model";
import { receitasemcontribuicao } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarReceitaSemContribuicaoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(receitasemcontribuicao)
		.where(eq(receitasemcontribuicao.id, id));

	return registro;
}

export async function criarReceitaSemContribuicao(
	dadosReceitaSemContribuicao: NovoReceitaSemContribuicao,
) {
	const [registro] = await db
		.insert(receitasemcontribuicao)
		.values(dadosReceitaSemContribuicao)
		.returning();

	return registro;
}

export async function atualizarReceitaSemContribuicao(
	id: string,
	dadosReceitaSemContribuicao: Partial<NovoReceitaSemContribuicao>,
) {
	const [registro] = await db
		.update(receitasemcontribuicao)
		.set(dadosReceitaSemContribuicao)
		.where(eq(receitasemcontribuicao.id, id))
		.returning();

	return registro;
}

export async function excluirReceitaSemContribuicao(id: string) {
	const [registro] = await db
		.delete(receitasemcontribuicao)
		.where(eq(receitasemcontribuicao.id, id))
		.returning();

	return registro;
}

export type ListarReceitasSemContribuicaoParametros = {
	idempresa: string;
	descricao?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarReceitasSemContribuicao({
	idempresa,
	descricao,
	page = 1,
	limit = 10,
}: ListarReceitasSemContribuicaoParametros) {
	const where = [];

	where.push(eq(receitasemcontribuicao.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(receitasemcontribuicao.descricao, `%${descricao}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, receitasemcontribuicaoListagem] = await Promise.all([
		db
			.select({ value: count() })
			.from(receitasemcontribuicao)
			.where(and(...where)),
		db
			.select()
			.from(receitasemcontribuicao)
			.where(and(...where))
			.orderBy(desc(receitasemcontribuicao.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		receitasemcontribuicao: receitasemcontribuicaoListagem,
		total: totalCount[0]?.value ?? 0,
	};
}
