import { and, asc, count, eq, ilike } from "drizzle-orm";
import type { NovoFatorConversao } from "@/model/fator-conversao-model.js";
import { fatorconversao } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarFatorConversaoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(fatorconversao)
		.where(eq(fatorconversao.id, id));

	return registro;
}

export async function verificarEmpresaPossuiFatoresConversao(
	idempresa: string,
): Promise<boolean> {
	const [resultado] = await db
		.select({ value: count() })
		.from(fatorconversao)
		.where(eq(fatorconversao.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarFatorConversao(dados: NovoFatorConversao) {
	const [registro] = await db
		.insert(fatorconversao)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarFatorConversao(
	id: string,
	dados: Partial<NovoFatorConversao>,
) {
	const [registro] = await db
		.update(fatorconversao)
		.set(dados)
		.where(eq(fatorconversao.id, id))
		.returning();

	return registro;
}

export async function excluirFatorConversao(id: string) {
	const [registro] = await db
		.delete(fatorconversao)
		.where(eq(fatorconversao.id, id))
		.returning();

	return registro;
}

export type ListarFatoresConversaoParametros = {
	idempresa: string;
	q?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarFatoresConversao({
	idempresa,
	q,
	page = 1,
	limit = 10,
}: ListarFatoresConversaoParametros) {
	const where = [eq(fatorconversao.idempresa, idempresa)];

	if (q) {
		where.push(ilike(fatorconversao.nome, `%${q}%`));
	}

	const offset = (page - 1) * limit;
	const filtro = and(...where);

	const [totalCount, fatores] = await Promise.all([
		db.select({ value: count() }).from(fatorconversao).where(filtro),
		db
			.select()
			.from(fatorconversao)
			.where(filtro)
			.orderBy(asc(fatorconversao.nome))
			.limit(limit)
			.offset(offset),
	]);

	return {
		fatores,
		total: totalCount[0]?.value ?? 0,
	};
}
