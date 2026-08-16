import { and, count, eq, ilike, or } from "drizzle-orm";
import type { NovoGrupoGourmet } from "@/model/grupo-gourmet-model";
import { grupogourmet, produtos } from "@/repositories/schema.js";
import { ordenacaoCodigoVarcharAsc } from "./ordenacao-codigo.js";
import { db } from "./connection";

export async function buscarGrupoGourmetPorId(id: string) {
	const [registro] = await db
		.select()
		.from(grupogourmet)
		.where(eq(grupogourmet.id, id));

	return registro;
}

export async function criarGrupoGourmet(dados: NovoGrupoGourmet) {
	const [registro] = await db.insert(grupogourmet).values(dados).returning();

	return registro;
}

export async function atualizarGrupoGourmet(
	id: string,
	dados: Partial<NovoGrupoGourmet>,
) {
	const [registro] = await db
		.update(grupogourmet)
		.set(dados)
		.where(eq(grupogourmet.id, id))
		.returning();

	return registro;
}

export async function excluirGrupoGourmet(id: string) {
	const [registro] = await db
		.delete(grupogourmet)
		.where(eq(grupogourmet.id, id))
		.returning();

	return registro;
}

export async function contarProdutosPorGrupoGourmet(idgrupogourmet: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(produtos)
		.where(eq(produtos.idgrupogourmet, idgrupogourmet));

	return resultado?.value ?? 0;
}

export type ListarGruposGourmetParametros = {
	idempresa: string;
	nome?: string | undefined;
	q?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarGruposGourmet({
	idempresa,
	nome,
	q,
	page = 1,
	limit = 10,
}: ListarGruposGourmetParametros) {
	const where = [eq(grupogourmet.idempresa, idempresa)];

	if (nome) {
		where.push(ilike(grupogourmet.nome, `%${nome}%`));
	}

	if (q) {
		const termo = `%${q}%`;
		where.push(
			or(ilike(grupogourmet.codigo, termo), ilike(grupogourmet.nome, termo)),
		);
	}

	const offset = (page - 1) * limit;

	const [totalCount, registros] = await Promise.all([
		db
			.select({ value: count() })
			.from(grupogourmet)
			.where(and(...where)),
		db
			.select()
			.from(grupogourmet)
			.where(and(...where))
			.orderBy(...ordenacaoCodigoVarcharAsc(grupogourmet.codigo))
			.limit(limit)
			.offset(offset),
	]);

	return {
		grupos: registros,
		total: totalCount[0]?.value ?? 0,
	};
}
