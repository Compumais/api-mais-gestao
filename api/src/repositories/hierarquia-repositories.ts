import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoHierarquia } from "@/model/hierarquia-model";
import { hierarquia } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarHierarquiaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(hierarquia)
		.where(eq(hierarquia.id, id));

	return registro;
}

export async function criarHierarquia(dadosHierarquia: NovoHierarquia) {
	const [registro] = await db
		.insert(hierarquia)
		.values(dadosHierarquia)
		.returning();

	return registro;
}

export async function atualizarHierarquia(
	id: string,
	dadosHierarquia: Partial<NovoHierarquia>,
) {
	const [registro] = await db
		.update(hierarquia)
		.set(dadosHierarquia)
		.where(eq(hierarquia.id, id))
		.returning();

	return registro;
}

export async function excluirHierarquia(id: string) {
	const [registro] = await db
		.delete(hierarquia)
		.where(eq(hierarquia.id, id))
		.returning();

	return registro;
}

export type ListarHierarquiasParametros = {
	idempresa: string;
	nome?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarHierarquias({
	idempresa,
	nome,
	page = 1,
	limit = 10,
}: ListarHierarquiasParametros) {
	const where = [];

	where.push(eq(hierarquia.idempresa, idempresa));

	if (nome) {
		where.push(ilike(hierarquia.nome, `%${nome}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, hierarquias] = await Promise.all([
		db
			.select({ value: count() })
			.from(hierarquia)
			.where(and(...where)),
		db
			.select()
			.from(hierarquia)
			.where(and(...where))
			.orderBy(desc(hierarquia.nome))
			.limit(limit)
			.offset(offset),
	]);

	return {
		hierarquias,
		total: totalCount[0]?.value ?? 0,
	};
}
