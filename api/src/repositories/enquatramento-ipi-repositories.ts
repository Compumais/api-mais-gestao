import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoEnquatramentoIPI } from "@/model/enquantramento-ipi-model";
import { enquatramentoipi } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarEnquatramentoIpiPorId(id: string) {
	const [registro] = await db
		.select()
		.from(enquatramentoipi)
		.where(eq(enquatramentoipi.id, id));

	return registro;
}

export async function criarEnquatramentoIpi(
	dadosEnquatramentoIpi: NovoEnquatramentoIPI,
) {
	const [registro] = await db
		.insert(enquatramentoipi)
		.values(dadosEnquatramentoIpi)
		.returning();

	return registro;
}

export async function atualizarEnquatramentoIpi(
	id: string,
	dadosEnquatramentoIpi: Partial<NovoEnquatramentoIPI>,
) {
	const [registro] = await db
		.update(enquatramentoipi)
		.set(dadosEnquatramentoIpi)
		.where(eq(enquatramentoipi.id, id))
		.returning();

	return registro;
}

export async function excluirEnquatramentoIpi(id: string) {
	const [registro] = await db
		.delete(enquatramentoipi)
		.where(eq(enquatramentoipi.id, id))
		.returning();

	return registro;
}

export type ListarEnquatramentosIpiParametros = {
	idempresa: string;
	descricao?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarEnquatramentosIpi({
	idempresa,
	descricao,
	page = 1,
	limit = 10,
}: ListarEnquatramentosIpiParametros) {
	const where = [];

	where.push(eq(enquatramentoipi.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(enquatramentoipi.descricao, `%${descricao}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, enquatramentosipi] = await Promise.all([
		db
			.select({ value: count() })
			.from(enquatramentoipi)
			.where(and(...where)),
		db
			.select()
			.from(enquatramentoipi)
			.where(and(...where))
			.orderBy(desc(enquatramentoipi.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		enquatramentosipi,
		total: totalCount[0]?.value ?? 0,
	};
}
