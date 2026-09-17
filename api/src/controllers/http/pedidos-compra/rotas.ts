import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import * as schema from "./doc-schema/schema.js";
import {
	buscarPedidoCompra,
	cancelarPedidoCompra,
	converterPedidoCompraCotacao,
	criarPedidoCompra,
	listarPedidosCompra,
} from "./handlers.js";

export async function pedidosCompraRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/pedidos-compra", {
		schema: schema.listarPedidosCompraSchema,
		handler: listarPedidosCompra,
	});
	app.post("/pedidos-compra", {
		schema: schema.criarPedidoCompraSchema,
		handler: criarPedidoCompra,
	});
	app.get("/pedidos-compra/:id", {
		schema: schema.buscarPedidoCompraSchema,
		handler: buscarPedidoCompra,
	});
	app.post("/pedidos-compra/:id/converter-cotacao", {
		schema: schema.converterPedidoCompraCotacaoSchema,
		handler: converterPedidoCompraCotacao,
	});
	app.post("/pedidos-compra/:id/cancelar", {
		schema: schema.cancelarPedidoCompraSchema,
		handler: cancelarPedidoCompra,
	});
}
