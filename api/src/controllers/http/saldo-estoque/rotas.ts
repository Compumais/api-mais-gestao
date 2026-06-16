import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarSaldoEstoque } from "./atualizar.js";
import { buscarSaldoEstoque } from "./buscar.js";
import { criarSaldoEstoque } from "./criar.js";
import * as schema from "./doc-schema/schemas.js";
import { excluirSaldoEstoque } from "./excluir.js";
import { listarSaldosEstoque } from "./listar-saldos-estoque.js";

export async function saldosEstoqueRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/saldos-estoque", {
		schema: schema.criarSaldoEstoqueSchema,
		handler: criarSaldoEstoque,
	});
	app.get("/saldos-estoque", {
		schema: schema.listarSaldosEstoqueSchema,
		handler: listarSaldosEstoque,
	});
	app.get("/saldos-estoque/:id", {
		schema: schema.buscarSaldoEstoqueSchema,
		handler: buscarSaldoEstoque,
	});
	app.put("/saldos-estoque/:id", {
		schema: schema.atualizarSaldoEstoqueSchema,
		handler: atualizarSaldoEstoque,
	});
	app.delete("/saldos-estoque/:id", {
		schema: schema.excluirSaldoEstoqueSchema,
		handler: excluirSaldoEstoque,
	});
}
