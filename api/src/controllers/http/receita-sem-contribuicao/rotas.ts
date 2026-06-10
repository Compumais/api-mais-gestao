import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarReceitaSemContribuicao } from "./atualizar.js";
import { buscarReceitaSemContribuicao } from "./buscar.js";
import { criarReceitaSemContribuicao } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirReceitaSemContribuicao } from "./excluir.js";
import { listarReceitaSemContribuicaos } from "./listar.js";

export async function receitasSemContribuicaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/receitas-sem-contribuicao", {
		schema: schema.criarReceitaSemContribuicaoSchema,
		handler: criarReceitaSemContribuicao,
	});
	app.get("/receitas-sem-contribuicao", {
		schema: schema.listarReceitaSemContribuicaosSchema,
		handler: listarReceitaSemContribuicaos,
	});
	app.get("/receitas-sem-contribuicao/:id", {
		schema: schema.buscarReceitaSemContribuicaoSchema,
		handler: buscarReceitaSemContribuicao,
	});
	app.put("/receitas-sem-contribuicao/:id", {
		schema: schema.atualizarReceitaSemContribuicaoSchema,
		handler: atualizarReceitaSemContribuicao,
	});
	app.delete("/receitas-sem-contribuicao/:id", {
		schema: schema.excluirReceitaSemContribuicaoSchema,
		handler: excluirReceitaSemContribuicao,
	});
}
