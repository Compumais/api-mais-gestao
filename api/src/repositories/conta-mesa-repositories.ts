import { and, count, desc, eq } from "drizzle-orm";
import type { NovaContaMesa } from "@/model/conta-mesa-model";
import { contamesa } from "@/repositories/schema";
import { db } from "./connection";

export async function buscarContaMesaPorId(id: string) {
	const [registro] = await db
		.select()
		.from(contamesa)
		.where(eq(contamesa.id, id));

	return registro;
}

export async function criarContaMesa(dadosContaMesa: NovaContaMesa) {
	const [registro] = await db
		.insert(contamesa)
		.values(dadosContaMesa)
		.returning();

	return registro;
}

export async function atualizarContaMesa(
	id: string,
	dadosContaMesa: Partial<NovaContaMesa>,
) {
	const [registro] = await db
		.update(contamesa)
		.set(dadosContaMesa)
		.where(eq(contamesa.id, id))
		.returning();

	return registro;
}

export async function excluirContaMesa(id: string) {
	const [registro] = await db
		.delete(contamesa)
		.where(eq(contamesa.id, id))
		.returning();

	return registro;
}

export type ListarContasMesaParametros = {
	idempresa: string;
	numeromesa?: number | undefined;
	status?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarContasMesa({
	idempresa,
	numeromesa,
	status,
	page = 1,
	limit = 10,
}: ListarContasMesaParametros) {
	const where = [eq(contamesa.idempresa, idempresa)];

	if (numeromesa !== undefined) {
		where.push(eq(contamesa.numeromesa, numeromesa));
	}

	if (status !== undefined) {
		where.push(eq(contamesa.status, status));
	}

	const offset = (page - 1) * limit;

	const [totalCount, contas] = await Promise.all([
		db
			.select({ value: count() })
			.from(contamesa)
			.where(and(...where)),
		db
			.select()
			.from(contamesa)
			.where(and(...where))
			.orderBy(desc(contamesa.datacriacao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		contas,
		total: totalCount[0]?.value ?? 0,
	};
}
