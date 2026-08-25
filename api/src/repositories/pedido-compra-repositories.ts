import { and, asc, count, desc, eq, max, sql } from "drizzle-orm";
import type {
	NovoPedidoCompra,
	NovoPedidoCompraItem,
} from "@/model/pedido-compra-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function buscarProximoCodigoPedidoCompra(idempresa: string) {
	const [resultado] = await db
		.select({ value: max(schema.pedidocompra.codigo) })
		.from(schema.pedidocompra)
		.where(eq(schema.pedidocompra.idempresa, idempresa));

	return (resultado?.value ?? 0) + 1;
}

export async function criarPedidosCompraEmLote(
	pedidos: Array<{
		cabecalho: NovoPedidoCompra;
		itens: NovoPedidoCompraItem[];
	}>,
) {
	return db.transaction(async (tx) => {
		const criados = [];

		for (const pedido of pedidos) {
			const [cabecalho] = await tx
				.insert(schema.pedidocompra)
				.values(pedido.cabecalho)
				.returning();
			if (!cabecalho) {
				throw new Error("Falha ao criar pedido de compra");
			}

			const itens =
				pedido.itens.length > 0
					? await tx
							.insert(schema.pedidocompraitem)
							.values(pedido.itens)
							.returning()
					: [];

			criados.push({ cabecalho, itens });
		}

		return criados;
	});
}

export async function buscarPedidoCompraPorId(id: string) {
	const [pedido] = await db
		.select()
		.from(schema.pedidocompra)
		.where(eq(schema.pedidocompra.id, id));
	return pedido;
}

export async function listarItensPedidoCompraEnriquecidos(
	idpedidocompra: string,
) {
	return db
		.select({
			id: schema.pedidocompraitem.id,
			idpedidocompra: schema.pedidocompraitem.idpedidocompra,
			idproduto: schema.pedidocompraitem.idproduto,
			descricao: schema.pedidocompraitem.descricao,
			quantidade: schema.pedidocompraitem.quantidade,
			precounitario: schema.pedidocompraitem.precounitario,
			total: schema.pedidocompraitem.total,
			idcotacaoitem: schema.pedidocompraitem.idcotacaoitem,
			codigoproduto: schema.produtos.codigo,
			nomeproduto: sql<string | null>`coalesce(${schema.pedidocompraitem.descricao}, ${schema.produtos.descricao}, ${schema.produtos.nome})`,
			descricaoproduto: schema.produtos.descricao,
		})
		.from(schema.pedidocompraitem)
		.leftJoin(
			schema.produtos,
			eq(schema.pedidocompraitem.idproduto, schema.produtos.id),
		)
		.where(eq(schema.pedidocompraitem.idpedidocompra, idpedidocompra))
		.orderBy(asc(schema.pedidocompraitem.id));
}

interface ListarPedidosCompraParametros {
	idempresa: string;
	status?: string | undefined;
	idcotacao?: string | undefined;
	page?: number | undefined;
	limit?: number | undefined;
}

export async function listarPedidosCompra({
	idempresa,
	status,
	idcotacao,
	page = 1,
	limit = 10,
}: ListarPedidosCompraParametros) {
	const where = [eq(schema.pedidocompra.idempresa, idempresa)];

	if (status) {
		where.push(eq(schema.pedidocompra.status, status));
	}

	if (idcotacao) {
		where.push(eq(schema.pedidocompra.idcotacao, idcotacao));
	}

	const offset = (page - 1) * limit;

	const [totalCount, pedidos] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.pedidocompra)
			.where(and(...where)),
		db
			.select({
				id: schema.pedidocompra.id,
				idempresa: schema.pedidocompra.idempresa,
				codigo: schema.pedidocompra.codigo,
				idcotacao: schema.pedidocompra.idcotacao,
				idproposta: schema.pedidocompra.idproposta,
				fornecedornome: schema.pedidocompra.fornecedornome,
				fornecedortelefone: schema.pedidocompra.fornecedortelefone,
				valortotal: schema.pedidocompra.valortotal,
				status: schema.pedidocompra.status,
				observacao: schema.pedidocompra.observacao,
				currenttimemillis: schema.pedidocompra.currenttimemillis,
				cotacaotitulo: schema.cotacaocompra.titulo,
				cotacaocodigo: schema.cotacaocompra.codigo,
			})
			.from(schema.pedidocompra)
			.leftJoin(
				schema.cotacaocompra,
				eq(schema.pedidocompra.idcotacao, schema.cotacaocompra.id),
			)
			.where(and(...where))
			.orderBy(desc(schema.pedidocompra.codigo))
			.limit(limit)
			.offset(offset),
	]);

	return {
		pedidos,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function atualizarPedidoCompra(
	id: string,
	dados: Partial<NovoPedidoCompra>,
) {
	const [pedido] = await db
		.update(schema.pedidocompra)
		.set(dados)
		.where(eq(schema.pedidocompra.id, id))
		.returning();
	return pedido;
}
