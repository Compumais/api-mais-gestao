import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type PlanoContas = typeof schema.planocontas.$inferSelect;
export type NovoPlanoContas = typeof schema.planocontas.$inferInsert;

export async function criarPlanoContas(dadosPlanoContas: NovoPlanoContas) {
	const planoContas = await db
		.insert(schema.planocontas)
		.values(dadosPlanoContas)
		.returning();

	return planoContas[0];
}

export async function verificarEmpresaPossuiPlanoContas(
	idempresa: string,
): Promise<boolean> {
	const [resultado] = await db
		.select({ value: count() })
		.from(schema.planocontas)
		.where(eq(schema.planocontas.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarPlanoContasEmLote(dadosPlanoContas: NovoPlanoContas[]) {
	if (dadosPlanoContas.length === 0) {
		return [];
	}

	return db
		.insert(schema.planocontas)
		.values(dadosPlanoContas)
		.returning();
}

export async function excluirPlanoContas({ id }: { id: string }) {
	const [planocontas] = await db
		.delete(schema.planocontas)
		.where(eq(schema.planocontas.id, id))
		.returning();

	return planocontas;
}

export async function buscarPlanoContasPorId(id: string) {
	const [planoContas] = await db
		.select()
		.from(schema.planocontas)
		.where(eq(schema.planocontas.id, id));

	return planoContas;
}

export async function buscarPlanoContasPorCodigo(
	idempresa: string,
	codigo: string,
) {
	const [planoContas] = await db
		.select()
		.from(schema.planocontas)
		.where(
			and(
				eq(schema.planocontas.idempresa, idempresa),
				eq(schema.planocontas.codigo, codigo),
			),
		)
		.limit(1);

	return planoContas;
}

export async function buscarProximoCodigoSemPai(idempresa: string) {
	const resultado = await db
		.select({
			count: sql<number>`count(*)::int`,
		})
		.from(schema.planocontas)
		.where(
			and(
				eq(schema.planocontas.idempresa, idempresa),
				isNull(schema.planocontas.idplanocontas),
			),
		);

	const count = resultado[0]?.count ?? 0;
	return (count + 1).toString();
}

export async function buscarProximoCodigoComPai(
	idempresa: string,
	idplanocontas: string,
) {
	const resultado = await db
		.select({
			count: sql<number>`count(*)::int`,
		})
		.from(schema.planocontas)
		.where(
			and(
				eq(schema.planocontas.idempresa, idempresa),
				eq(schema.planocontas.idplanocontas, idplanocontas),
			),
		);

	const count = resultado[0]?.count ?? 0;
	return (count + 1).toString();
}

export type ListarPlanoContasParametros = {
	idempresas: string[];
	idplanocontas?: string | undefined;
	inativo?: number;
	page?: number;
	limit?: number;
	listarTudo?: boolean;
	tipomovimento?: "E" | "S" | undefined;
};

export async function listarPlanoContasPorEmpresas({
	idempresas,
	idplanocontas,
	inativo,
	page = 1,
	limit = 10,
	listarTudo = false,
	tipomovimento,
}: ListarPlanoContasParametros) {
	const where = [];

	if (idempresas.length === 0) {
		return {
			planosContas: [],
			total: 0,
		};
	}

	where.push(inArray(schema.planocontas.idempresa, idempresas));

	if (idplanocontas) {
		where.push(eq(schema.planocontas.idplanocontas, idplanocontas));
	} else if (!listarTudo) {
		where.push(isNull(schema.planocontas.idplanocontas));
	}

	if (inativo) {
		where.push(eq(schema.planocontas.inativo, inativo));
	}

	if (tipomovimento) {
		where.push(eq(schema.planocontas.tipomovimento, tipomovimento));
	}

	const offset = (page - 1) * limit;

	const [totalCount, planosContas] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.planocontas)
			.where(and(...where)),
		db
			.select()
			.from(schema.planocontas)
			.where(and(...where))
			.orderBy(schema.planocontas.codigo)
			.limit(limit)
			.offset(offset),
	]);

	return {
		planosContas,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarPlanosFilhos(idplanocontas: string) {
	const planosFilhos = await db
		.select()
		.from(schema.planocontas)
		.where(eq(schema.planocontas.idplanocontas, idplanocontas));

	return planosFilhos;
}

export async function buscarPlanoContasComFilhos(id: string): Promise<{
	plano: PlanoContas | undefined;
	filhos: PlanoContas[];
}> {
	const plano = await buscarPlanoContasPorId(id);

	if (!plano) {
		return {
			plano: undefined,
			filhos: [],
		};
	}

	const filhosDiretos = await buscarPlanosFilhos(id);
	const todosFilhos: PlanoContas[] = [...filhosDiretos];

	// Busca recursiva dos filhos
	for (const filho of filhosDiretos) {
		const filhosRecursivos = await buscarPlanoContasComFilhos(filho.id);
		todosFilhos.push(...filhosRecursivos.filhos);
	}

	return {
		plano,
		filhos: todosFilhos,
	};
}

export async function atualizarPlanoContas(
	id: string,
	dados: Partial<NovoPlanoContas>,
) {
	const [planoContas] = await db
		.update(schema.planocontas)
		.set(dados)
		.where(eq(schema.planocontas.id, id))
		.returning();

	return planoContas;
}
