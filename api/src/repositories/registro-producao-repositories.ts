import { and, count, desc, eq } from "drizzle-orm";
import type { NovoRegistroProducao } from "@/model/registro-producao-model.js";
import type { NovoRegistroProducaoItem } from "@/model/registro-producao-item-model.js";
import {
	produtos,
	registroproducao,
	registroproducaoitem,
} from "@/repositories/schema.js";
import { db } from "./connection.js";

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
	page?: number;
	limit?: number;
};

export async function listarRegistrosProducao({
	idempresa,
	origem,
	idprodutoacabado,
	page = 1,
	limit = 10,
}: ListarRegistrosProducaoParametros) {
	const where = [eq(registroproducao.idempresa, idempresa)];

	if (origem !== undefined) {
		where.push(eq(registroproducao.origem, origem));
	}
	if (idprodutoacabado) {
		where.push(eq(registroproducao.idprodutoacabado, idprodutoacabado));
	}

	const filtro = and(...where);
	const offset = (page - 1) * limit;

	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(registroproducao).where(filtro),
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
			.leftJoin(
				produtos,
				eq(registroproducao.idprodutoacabado, produtos.id),
			)
			.where(filtro)
			.orderBy(desc(registroproducao.datahora))
			.limit(limit)
			.offset(offset),
	]);

	return {
		registros,
		total: totalCount[0]?.value ?? 0,
	};
}
