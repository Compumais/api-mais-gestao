import { and, asc, count, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { LocalEstoque, NovoLocalEstoque } from "@/model/local-estoque-model";
import { localestoque } from "@/repositories/schema.js";
import { db } from "./connection";

export async function desmarcarPadraoLocalEstoqueEmpresa(
	idempresa: string,
	excetoId?: string,
) {
	const condicoes = [eq(localestoque.idempresa, idempresa), eq(localestoque.padrao, 1)];
	if (excetoId) {
		condicoes.push(ne(localestoque.id, excetoId));
	}
	await db
		.update(localestoque)
		.set({ padrao: 0 })
		.where(and(...condicoes));
}

export async function criarLocalEstoque(dadosLocalEstoque: NovoLocalEstoque) {
	let padraoResolvido = dadosLocalEstoque.padrao ?? 0;

	if (padraoResolvido === 1) {
		await desmarcarPadraoLocalEstoqueEmpresa(dadosLocalEstoque.idempresa);
	} else if ((dadosLocalEstoque.inativo ?? 0) === 0) {
		const existenteAtivo = await buscarPrimeiroLocalEstoqueEmpresa(
			dadosLocalEstoque.idempresa,
		);
		if (!existenteAtivo) {
			padraoResolvido = 1;
		}
	}

	const [registro] = await db
		.insert(localestoque)
		.values({
			...dadosLocalEstoque,
			padrao: padraoResolvido,
		})
		.returning();

	return registro;
}

export async function buscarLocalEstoquePorId(id: string) {
	const [registro] = await db
		.select()
		.from(localestoque)
		.where(eq(localestoque.id, id));

	return registro;
}

export async function buscarPrimeiroLocalEstoqueEmpresa(idempresa: string) {
	const [registro] = await db
		.select()
		.from(localestoque)
		.where(
			and(
				eq(localestoque.idempresa, idempresa),
				or(eq(localestoque.inativo, 0), isNull(localestoque.inativo)),
			),
		)
		.orderBy(
			desc(sql`COALESCE(${localestoque.padrao}, 0)`),
			asc(localestoque.codigo),
			asc(localestoque.descricao),
		)
		.limit(1);

	return registro;
}

export async function garantirLocalEstoqueEmpresa(
	idempresa: string,
): Promise<{ local: LocalEstoque; criado: boolean } | undefined> {
	const ativo = await buscarPrimeiroLocalEstoqueEmpresa(idempresa);
	if (ativo) return { local: ativo, criado: false };

	const [qualquer] = await db
		.select()
		.from(localestoque)
		.where(eq(localestoque.idempresa, idempresa))
		.orderBy(
			desc(sql`COALESCE(${localestoque.padrao}, 0)`),
			asc(localestoque.codigo),
			asc(localestoque.descricao),
		)
		.limit(1);

	if (qualquer) return { local: qualquer, criado: false };

	const criado = await criarLocalEstoque({
		id: uuidv4(),
		idempresa,
		codigo: "1",
		descricao: "Estoque",
		inativo: 0,
		padrao: 1,
		posse: "0",
		tipo: 1,
	});

	if (!criado) return undefined;
	return { local: criado, criado: true };
}

export async function atualizarLocalEstoque(
	id: string,
	dados: {
		codigo?: string | null | undefined;
		descricao?: string | null | undefined;
		inativo?: number | null | undefined;
		padrao?: number | null | undefined;
		posse?: string | null | undefined;
		tipo?: number | null | undefined;
	},
	idempresa?: string,
) {
	if (dados.padrao === 1) {
		const empresaAlvo =
			idempresa ?? (await buscarLocalEstoquePorId(id))?.idempresa;
		if (empresaAlvo) {
			await desmarcarPadraoLocalEstoqueEmpresa(empresaAlvo, id);
		}
	}

	const [registro] = await db
		.update(localestoque)
		.set(dados)
		.where(eq(localestoque.id, id))
		.returning();

	return registro;
}

export async function excluirLocalEstoque(id: string) {
	const [registro] = await db
		.delete(localestoque)
		.where(eq(localestoque.id, id))
		.returning();

	return registro;
}

export type ListarLocaisEstoqueParametros = {
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarLocaisEstoque({
	idempresa,
	descricao,
	codigo,
	page = 1,
	limit = 10,
}: ListarLocaisEstoqueParametros) {
	const where = [eq(localestoque.idempresa, idempresa)];

	if (descricao) {
		where.push(ilike(localestoque.descricao, `%${descricao}%`));
	}

	if (codigo) {
		where.push(ilike(localestoque.codigo, `%${codigo}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, locaisEstoque] = await Promise.all([
		db
			.select({ value: count() })
			.from(localestoque)
			.where(and(...where)),
		db
			.select()
			.from(localestoque)
			.where(and(...where))
			.orderBy(
				desc(sql`COALESCE(${localestoque.padrao}, 0)`),
				asc(localestoque.codigo),
				asc(localestoque.descricao),
			)
			.limit(limit)
			.offset(offset),
	]);

	return {
		locaisEstoque,
		total: totalCount[0]?.value ?? 0,
	};
}
