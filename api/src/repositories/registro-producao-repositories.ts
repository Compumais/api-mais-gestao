import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	ilike,
	lte,
	type SQL,
	sql,
} from "drizzle-orm";
import type { NovoRegistroProducao } from "@/model/registro-producao-model.js";
import type { NovoRegistroProducaoItem } from "@/model/registro-producao-item-model.js";
import {
	produtos,
	registroproducao,
	registroproducaoitem,
} from "@/repositories/schema.js";
import { db } from "./connection.js";

export const ORDENAR_PRODUCOES_CAMPOS = [
	"datahora",
	"nome",
	"codigo",
	"quantidadeproduzida",
	"origem",
	"custounitario",
	"custototal",
] as const;

export type OrdenarProducoesCampo =
	(typeof ORDENAR_PRODUCOES_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	datahora: registroproducao.datahora,
	nome: produtos.nome,
	codigo: produtos.codigo,
	quantidadeproduzida: registroproducao.quantidadeproduzida,
	origem: registroproducao.origem,
	custounitario: registroproducao.custounitario,
	custototal: registroproducao.custototal,
} as const;

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

function filtroDataDia(
	coluna: typeof registroproducao.datahora,
	data: string,
) {
	return and(
		gte(coluna, `${data}T00:00:00.000`),
		lte(coluna, `${data}T23:59:59.999`),
	);
}

export async function criarRegistroProducaoComItens(
	dados: NovoRegistroProducao,
	itens: NovoRegistroProducaoItem[],
) {
	return db.transaction(async (tx) => {
		const [registro] = await tx
			.insert(registroproducao)
			.values(dados)
			.returning();
		if (!registro) return null;

		const itensCriados =
			itens.length > 0
				? await tx.insert(registroproducaoitem).values(itens).returning()
				: [];

		return { registro, itens: itensCriados };
	});
}

export async function buscarRegistroProducaoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(registroproducao)
		.where(eq(registroproducao.id, id));
	return registro;
}

export async function buscarRegistroProducaoVendaAtivo(params: {
	idoriginal: string;
	idprodutoacabado: string;
	tipoestoque: number;
}) {
	const [registro] = await db
		.select()
		.from(registroproducao)
		.where(
			and(
				eq(registroproducao.idoriginal, params.idoriginal),
				eq(registroproducao.idprodutoacabado, params.idprodutoacabado),
				eq(registroproducao.tipoestoque, params.tipoestoque),
				eq(registroproducao.status, 1),
				eq(registroproducao.origem, 1),
			),
		)
		.limit(1);
	return registro;
}

export async function listarItensRegistroProducao(idregistroproducao: string) {
	return db
		.select({
			id: registroproducaoitem.id,
			idregistroproducao: registroproducaoitem.idregistroproducao,
			idproduto: registroproducaoitem.idproduto,
			tipo: registroproducaoitem.tipo,
			quantidade: registroproducaoitem.quantidade,
			custounitario: registroproducaoitem.custounitario,
			custototal: registroproducaoitem.custototal,
			nomeproduto: produtos.nome,
			codigoproduto: produtos.codigo,
			unidademedida: produtos.unidademedida,
		})
		.from(registroproducaoitem)
		.leftJoin(produtos, eq(registroproducaoitem.idproduto, produtos.id))
		.where(eq(registroproducaoitem.idregistroproducao, idregistroproducao));
}

export type ListarRegistrosProducaoParametros = {
	idempresa: string;
	origem?: number | undefined;
	idprodutoacabado?: string | undefined;
	nome?: string | undefined;
	codigo?: string | undefined;
	datahora?: string | undefined;
	ordenarPor?: OrdenarProducoesCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarRegistrosProducao({
	idempresa,
	origem,
	idprodutoacabado,
	nome,
	codigo,
	datahora,
	ordenarPor,
	ordem = "desc",
	page = 1,
	limit = 10,
}: ListarRegistrosProducaoParametros) {
	const where: SQL[] = [eq(registroproducao.idempresa, idempresa)];

	if (origem !== undefined) {
		where.push(eq(registroproducao.origem, origem));
	}
	if (idprodutoacabado) {
		where.push(eq(registroproducao.idprodutoacabado, idprodutoacabado));
	}

	adicionarFiltroTexto(where, produtos.nome, nome);
	adicionarFiltroTexto(
		where,
		sql`CAST(${produtos.codigo} AS TEXT)`,
		codigo,
	);

	if (datahora?.trim()) {
		const condicao = filtroDataDia(registroproducao.datahora, datahora.trim());
		if (condicao) {
			where.push(condicao);
		}
	}

	const filtro = and(...where);
	const offset = (page - 1) * limit;

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "asc"
				? asc(COLUNAS_ORDENACAO[ordenarPor])
				: desc(COLUNAS_ORDENACAO[ordenarPor])
			: desc(registroproducao.datahora);

	const joinProduto = eq(registroproducao.idprodutoacabado, produtos.id);

	const [totalCount, registros] = await Promise.all([
		db
			.select({ value: count() })
			.from(registroproducao)
			.leftJoin(produtos, joinProduto)
			.where(filtro),
		db
			.select({
				id: registroproducao.id,
				idempresa: registroproducao.idempresa,
				idfichaproducao: registroproducao.idfichaproducao,
				idprodutoacabado: registroproducao.idprodutoacabado,
				origem: registroproducao.origem,
				quantidadeproduzida: registroproducao.quantidadeproduzida,
				custototal: registroproducao.custototal,
				custounitario: registroproducao.custounitario,
				idoriginal: registroproducao.idoriginal,
				tipoestoque: registroproducao.tipoestoque,
				idusuario: registroproducao.idusuario,
				status: registroproducao.status,
				datahora: registroproducao.datahora,
				nomeprodutoacabado: produtos.nome,
				codigoprodutoacabado: produtos.codigo,
			})
			.from(registroproducao)
			.leftJoin(produtos, joinProduto)
			.where(filtro)
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		registros,
		total: totalCount[0]?.value ?? 0,
	};
}
