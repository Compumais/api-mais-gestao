import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoDepartamento } from "@/model/departamento-model";
import { departamento } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarDepartamentoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(departamento)
		.where(eq(departamento.id, id));

	return registro;
}

export async function criarDepartamento(dadosDepartamento: NovoDepartamento) {
	const [registro] = await db
		.insert(departamento)
		.values(dadosDepartamento)
		.returning();

	return registro;
}

export async function atualizarDepartamento(
	id: string,
	dadosDepartamento: Partial<NovoDepartamento>,
) {
	const [registro] = await db
		.update(departamento)
		.set(dadosDepartamento)
		.where(eq(departamento.id, id))
		.returning();

	return registro;
}

export async function excluirDepartamento(id: string) {
	const [registro] = await db
		.delete(departamento)
		.where(eq(departamento.id, id))
		.returning();

	return registro;
}

export type ListarDepartamentosParametros = {
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarDepartamentos({
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarDepartamentosParametros) {
	const where = [];

	where.push(eq(departamento.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(departamento.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(departamento.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, departamentos] = await Promise.all([
		db
			.select({ value: count() })
			.from(departamento)
			.where(and(...where)),
		db
			.select()
			.from(departamento)
			.where(and(...where))
			.orderBy(desc(departamento.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		departamentos,
		total: totalCount[0]?.value ?? 0,
	};
}
