import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarVendaPdvItem } from "./atualizar.js";
import { buscarVendaPdvItem } from "./buscar.js";
import { criarVendaPdvItem } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirVendaPdvItem } from "./excluir.js";
import { listarVendasPdvItem } from "./listar.js";

export async function vendasPdvItemRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/vendas-pdv-item", {
		schema: schema.criarVendaPdvItemSchema,
		handler: criarVendaPdvItem,
	});
	app.get("/vendas-pdv-item", {
		schema: schema.listarVendasPdvItemSchema,
		handler: listarVendasPdvItem,
	});
	app.get("/vendas-pdv-item/:id", {
		schema: schema.buscarVendaPdvItemSchema,
		handler: buscarVendaPdvItem,
	});
	app.put("/vendas-pdv-item/:id", {
		schema: schema.atualizarVendaPdvItemSchema,
		handler: atualizarVendaPdvItem,
	});
	app.delete("/vendas-pdv-item/:id", {
		schema: schema.excluirVendaPdvItemSchema,
		handler: excluirVendaPdvItem,
	});
}
