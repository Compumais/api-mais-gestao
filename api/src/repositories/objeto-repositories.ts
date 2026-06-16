import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoObjeto } from "@/model/objeto-model";
import { objeto } from "@/repositories/schema.js";
import { db } from "./connection";
import type { AtualizacaoParcial } from "@/util/type-util";

type NovoObjetoDados = Pick<NovoObjeto, "id" | "idempresa"> &
	AtualizacaoParcial<Omit<NovoObjeto, "id" | "idempresa">>;

export async function buscarObjetoPorId(id: string) {
	const [registro] = await db.select().from(objeto).where(eq(objeto.id, id));

	return registro;
}

export async function criarObjeto(dadosObjeto: NovoObjetoDados) {
	const [registro] = await db.insert(objeto).values(dadosObjeto).returning();

	return registro;
}

export async function atualizarObjeto(
	id: string,
	dadosObjeto: Partial<NovoObjeto>,
) {
	const [registro] = await db
		.update(objeto)
		.set(dadosObjeto)
		.where(eq(objeto.id, id))
		.returning();

	return registro;
}

export async function excluirObjeto(id: string) {
	const [registro] = await db
		.delete(objeto)
		.where(eq(objeto.id, id))
		.returning();

	return registro;
}

export type ListarObjetosParametros = {
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarObjetos({
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarObjetosParametros) {
	const where = [];

	where.push(eq(objeto.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(objeto.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		where.push(eq(objeto.inativo, inativo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, objetos] = await Promise.all([
		db
			.select({ value: count() })
			.from(objeto)
			.where(and(...where)),
		db
			.select()
			.from(objeto)
			.where(and(...where))
			.orderBy(desc(objeto.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		objetos,
		total: totalCount[0]?.value ?? 0,
	};
}
