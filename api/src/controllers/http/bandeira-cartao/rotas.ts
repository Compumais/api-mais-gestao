import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarBandeiraCartao } from "./atualizar.js";
import { buscarBandeiraCartao } from "./buscar.js";
import { criarBandeiraCartao } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirBandeiraCartao } from "./excluir.js";
import { listarBandeirasCartao } from "./listar.js";
import { popularBandeirasCartaoPadrao } from "./popular-padrao.js";

export async function bandeirasCartaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/bandeiras-cartao", {
		schema: schema.criarBandeiraCartaoSchema,
		handler: criarBandeiraCartao,
	});
	app.get("/bandeiras-cartao", {
		schema: schema.listarBandeirasCartaoSchema,
		handler: listarBandeirasCartao,
	});
	app.post("/bandeiras-cartao/popular-padrao", {
		handler: popularBandeirasCartaoPadrao,
	});
	app.get("/bandeiras-cartao/:id", {
		schema: schema.buscarBandeiraCartaoSchema,
		handler: buscarBandeiraCartao,
	});
	app.put("/bandeiras-cartao/:id", {
		schema: schema.atualizarBandeiraCartaoSchema,
		handler: atualizarBandeiraCartao,
	});
	app.delete("/bandeiras-cartao/:id", {
		schema: schema.excluirBandeiraCartaoSchema,
		handler: excluirBandeiraCartao,
	});
}
