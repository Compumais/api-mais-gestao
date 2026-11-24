import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarRetornoBancario } from "./buscar.js";
import { importarRetornoBancario } from "./importar.js";
import { listarRetornosBancarios } from "./listar.js";
import { processarRetornoBancario } from "./processar.js";

export async function retornoBancarioRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/retornos-bancarios", {
		handler: listarRetornosBancarios,
	});
	app.post("/retornos-bancarios/importar", {
		handler: importarRetornoBancario,
	});
	app.get("/retornos-bancarios/:id", {
		handler: buscarRetornoBancario,
	});
	app.post("/retornos-bancarios/:id/processar", {
		handler: processarRetornoBancario,
	});
}
