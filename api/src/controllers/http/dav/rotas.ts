import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarDav } from "./atualizar.js";
import { buscarDav } from "./buscar.js";
import { cancelarDav } from "./cancelar.js";
import { criarDav } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirDav } from "./excluir.js";
import { faturarDavNfe } from "./faturar-nfe.js";
import { contextoEmissaoNfePedido } from "./contexto-emissao-nfe.js";
import { contextoEmissaoNfeLote } from "./contexto-emissao-nfe-lote.js";
import { listarDavs } from "./listar.js";
import { criarDavItem } from "./itens/criar.js";
import { listarDavItens } from "./itens/listar.js";
import { atualizarDavItem } from "./itens/atualizar.js";
import { excluirDavItem } from "./itens/excluir.js";

export async function davsRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/davs", {
		schema: schema.criarDavSchema,
		handler: criarDav,
	});
	app.get("/davs", {
		schema: schema.listarDavsSchema,
		handler: listarDavs,
	});
	app.get("/davs/contexto-emissao-nfe-lote", {
		handler: contextoEmissaoNfeLote,
	});
	app.get("/davs/:id", {
		schema: schema.buscarDavSchema,
		handler: buscarDav,
	});
	app.put("/davs/:id", {
		schema: schema.atualizarDavSchema,
		handler: atualizarDav,
	});
	app.delete("/davs/:id", {
		schema: schema.excluirDavSchema,
		handler: excluirDav,
	});
	app.post("/davs/:id/cancelar", {
		handler: cancelarDav,
	});
	app.post("/davs/:id/faturar-nfe", {
		handler: faturarDavNfe,
	});
	app.get("/davs/:id/contexto-emissao-nfe", {
		handler: contextoEmissaoNfePedido,
	});
	app.get("/davs/:id/itens", {
		handler: listarDavItens,
	});
	app.post("/davs/:id/itens", {
		handler: criarDavItem,
	});
	app.put("/davs/:id/itens/:iditem", {
		handler: atualizarDavItem,
	});
	app.delete("/davs/:id/itens/:iditem", {
		handler: excluirDavItem,
	});
}
