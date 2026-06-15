import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarVendaPdvGourmet } from "./atualizar.js";
import { buscarVendaPdvGourmet } from "./buscar.js";
import { criarVendaPdvGourmet } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirVendaPdvGourmet } from "./excluir.js";
import { listarVendasPdvGourmet } from "./listar.js";

export async function vendasPdvGourmetRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/vendas-pdv-gourmet", {
		schema: schema.criarVendaPdvGourmetSchema,
		handler: criarVendaPdvGourmet,
	});
	app.get("/vendas-pdv-gourmet", {
		schema: schema.listarVendasPdvGourmetSchema,
		handler: listarVendasPdvGourmet,
	});
	app.get("/vendas-pdv-gourmet/:id", {
		schema: schema.buscarVendaPdvGourmetSchema,
		handler: buscarVendaPdvGourmet,
	});
	app.put("/vendas-pdv-gourmet/:id", {
		schema: schema.atualizarVendaPdvGourmetSchema,
		handler: atualizarVendaPdvGourmet,
	});
	app.delete("/vendas-pdv-gourmet/:id", {
		schema: schema.excluirVendaPdvGourmetSchema,
		handler: excluirVendaPdvGourmet,
	});
}
