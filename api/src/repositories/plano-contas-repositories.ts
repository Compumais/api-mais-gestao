import {
	and,
	count,
	eq,
	inArray,
	isNotNull,
	isNull,
	notInArray,
	sql,
} from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";
import { ordenacaoCodigoHierarquicoAsc } from "./ordenacao-codigo.js";

export type PlanoContas = typeof schema.planocontas.$inferSelect;
export type NovoPlanoContas = typeof schema.planocontas.$inferInsert;

export type TransacaoDb = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

export async function criarPlanoContasEmLote(
	dadosPlanoContas: NovoPlanoContas[],
) {
	if (dadosPlanoContas.length === 0) {
		return [];
	}

	return db.insert(schema.planocontas).values(dadosPlanoContas).returning();
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
			.orderBy(...ordenacaoCodigoHierarquicoAsc(schema.planocontas.codigo))
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
		.where(eq(schema.planocontas.idplanocontas, idplanocontas))
		.orderBy(...ordenacaoCodigoHierarquicoAsc(schema.planocontas.codigo));

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

export async function listarTodosPlanoContasPorEmpresa(idempresa: string) {
	const planosContas = await db
		.select()
		.from(schema.planocontas)
		.where(eq(schema.planocontas.idempresa, idempresa))
		.orderBy(...ordenacaoCodigoHierarquicoAsc(schema.planocontas.codigo));

	return planosContas;
}

export type VinculoPlanoContas = {
	tabela: string;
	quantidade: number;
};

export async function buscarVinculosPlanoContasPorEmpresa(
	idempresa: string,
): Promise<VinculoPlanoContas[]> {
	const idsPlanos = db
		.select({ id: schema.planocontas.id })
		.from(schema.planocontas)
		.where(eq(schema.planocontas.idempresa, idempresa));

	const contagens = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.financeiro)
			.where(inArray(schema.financeiro.idplanocontas, idsPlanos)),
		db
			.select({ value: count() })
			.from(schema.contacorrentelancamento)
			.where(inArray(schema.contacorrentelancamento.idplanocontas, idsPlanos)),
		db
			.select({ value: count() })
			.from(schema.produtos)
			.where(inArray(schema.produtos.idplanocontas, idsPlanos)),
		db
			.select({ value: count() })
			.from(schema.cfop)
			.where(inArray(schema.cfop.idplanocontas, idsPlanos)),
		db
			.select({ value: count() })
			.from(schema.operacaofiscal)
			.where(inArray(schema.operacaofiscal.idplanocontas, idsPlanos)),
		db
			.select({ value: count() })
			.from(schema.tipodocumentofinanceiro)
			.where(inArray(schema.tipodocumentofinanceiro.idplanocontas, idsPlanos)),
		db
			.select({ value: count() })
			.from(schema.notafiscal)
			.where(inArray(schema.notafiscal.idplanocontas, idsPlanos)),
		db
			.select({ value: count() })
			.from(schema.planocontascontacontabil)
			.where(inArray(schema.planocontascontacontabil.idplanocontas, idsPlanos)),
		db
			.select({ value: count() })
			.from(schema.entidade)
			.where(inArray(schema.entidade.idplanocontas, idsPlanos)),
	]);

	const tabelas = [
		"Financeiro (contas a pagar/receber)",
		"Lançamentos de caixa",
		"Produtos",
		"CFOPs",
		"Operações fiscais",
		"Tipos de documento financeiro",
		"Notas fiscais",
		"Integração contábil",
		"Entidades (clientes/fornecedores)",
	];

	return tabelas
		.map((tabela, indice) => ({
			tabela,
			quantidade: contagens[indice]?.[0]?.value ?? 0,
		}))
		.filter((vinculo) => vinculo.quantidade > 0);
}

export async function excluirTodosPlanoContasPorEmpresa(
	tx: TransacaoDb,
	idempresa: string,
) {
	// A self-FK usa ON DELETE RESTRICT, então exclui as folhas repetidamente
	// até que não reste nenhum registro da empresa
	let excluidos = 0;

	for (;;) {
		const idsComFilhos = tx
			.selectDistinct({ id: schema.planocontas.idplanocontas })
			.from(schema.planocontas)
			.where(
				and(
					eq(schema.planocontas.idempresa, idempresa),
					isNotNull(schema.planocontas.idplanocontas),
				),
			);

		const resultado = await tx
			.delete(schema.planocontas)
			.where(
				and(
					eq(schema.planocontas.idempresa, idempresa),
					notInArray(schema.planocontas.id, idsComFilhos),
				),
			)
			.returning({ id: schema.planocontas.id });

		excluidos += resultado.length;

		if (resultado.length === 0) {
			break;
		}
	}

	return excluidos;
}

const TAMANHO_LOTE_INSERCAO = 1000;

export async function inserirPlanoContasEmLote(
	tx: TransacaoDb,
	dadosPlanoContas: NovoPlanoContas[],
) {
	let inseridos = 0;

	for (
		let inicio = 0;
		inicio < dadosPlanoContas.length;
		inicio += TAMANHO_LOTE_INSERCAO
	) {
		const lote = dadosPlanoContas.slice(inicio, inicio + TAMANHO_LOTE_INSERCAO);
		const resultado = await tx
			.insert(schema.planocontas)
			.values(lote)
			.returning({ id: schema.planocontas.id });

		inseridos += resultado.length;
	}

	return inseridos;
}

export async function substituirPlanoContasPorEmpresa(
	idempresa: string,
	dadosPlanoContas: NovoPlanoContas[],
) {
	return db.transaction(async (tx) => {
		const excluidos = await excluirTodosPlanoContasPorEmpresa(tx, idempresa);
		const inseridos = await inserirPlanoContasEmLote(tx, dadosPlanoContas);

		return { excluidos, inseridos };
	});
}

export async function moverPlanoContasComCodigos(
	id: string,
	idplanocontas: string | null,
	codigos: { id: string; codigo: string }[],
) {
	return db.transaction(async (tx) => {
		await atualizarPaiPlanoContas(tx, id, idplanocontas);
		await atualizarCodigosPlanoContasEmLote(tx, codigos);
	});
}

export async function atualizarPaiPlanoContas(
	tx: TransacaoDb,
	id: string,
	idplanocontas: string | null,
) {
	const [planoContas] = await tx
		.update(schema.planocontas)
		.set({ idplanocontas })
		.where(eq(schema.planocontas.id, id))
		.returning();

	return planoContas;
}

export async function atualizarCodigosPlanoContasEmLote(
	tx: TransacaoDb,
	codigos: { id: string; codigo: string }[],
) {
	if (codigos.length === 0) {
		return;
	}

	for (
		let inicio = 0;
		inicio < codigos.length;
		inicio += TAMANHO_LOTE_INSERCAO
	) {
		const lote = codigos.slice(inicio, inicio + TAMANHO_LOTE_INSERCAO);
		const valores = sql.join(
			lote.map((item) => sql`(${item.id}, ${item.codigo})`),
			sql`, `,
		);

		await tx.execute(sql`
			update planocontas as p
			set codigo = v.codigo
			from (values ${valores}) as v(id, codigo)
			where p.id = v.id
		`);
	}
}
