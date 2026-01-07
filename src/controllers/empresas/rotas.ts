import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../middleware/verify-jwt.js";
import { atualizarEmpresa } from "./atualizar.js";
import { buscarEmpresa } from "./buscar.js";
import { criarEmpresa } from "./criar.js";
import { excluirEmpresa } from "./excluir.js";
import { listarEmpresas } from "./listar-empresas.js";

export async function empresasRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/empresas", criarEmpresa);
	app.get("/empresas", listarEmpresas);
	app.get("/empresas/:id", buscarEmpresa);
	app.put("/empresas/:id", atualizarEmpresa);
	app.delete("/empresas/:id", excluirEmpresa);
}
