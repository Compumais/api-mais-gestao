import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarModeloImpressaoPedido,
	buscarModeloImpressaoPedido,
	criarModeloImpressaoPedido,
	definirPrimarioModeloImpressaoPedido,
	duplicarModeloImpressaoPedido,
	excluirModeloImpressaoPedido,
	listarModelosImpressaoPedido,
	seedModelosImpressaoPedido,
} from "./acoes.js";

export async function modeloImpressaoPedidoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/empresas/:idempresa/modelos-impressao-pedido", {
		handler: listarModelosImpressaoPedido,
	});
	app.post("/empresas/:idempresa/modelos-impressao-pedido", {
		handler: criarModeloImpressaoPedido,
	});
	app.post("/empresas/:idempresa/modelos-impressao-pedido/seed", {
		handler: seedModelosImpressaoPedido,
	});
	app.get("/empresas/:idempresa/modelos-impressao-pedido/:id", {
		handler: buscarModeloImpressaoPedido,
	});
	app.put("/empresas/:idempresa/modelos-impressao-pedido/:id", {
		handler: atualizarModeloImpressaoPedido,
	});
	app.delete("/empresas/:idempresa/modelos-impressao-pedido/:id", {
		handler: excluirModeloImpressaoPedido,
	});
	app.post(
		"/empresas/:idempresa/modelos-impressao-pedido/:id/definir-primario",
		{
			handler: definirPrimarioModeloImpressaoPedido,
		},
	);
	app.post("/empresas/:idempresa/modelos-impressao-pedido/:id/duplicar", {
		handler: duplicarModeloImpressaoPedido,
	});
}
