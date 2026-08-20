import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarModeloImpressaoOs,
	buscarModeloImpressaoOs,
	criarModeloImpressaoOs,
	definirPrimarioModeloImpressaoOs,
	duplicarModeloImpressaoOs,
	excluirModeloImpressaoOs,
	listarModelosImpressaoOs,
	seedModelosImpressaoOs,
} from "./acoes.js";

export async function modeloImpressaoOsRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/empresas/:idempresa/modelos-impressao-os", {
		handler: listarModelosImpressaoOs,
	});
	app.post("/empresas/:idempresa/modelos-impressao-os", {
		handler: criarModeloImpressaoOs,
	});
	app.post("/empresas/:idempresa/modelos-impressao-os/seed", {
		handler: seedModelosImpressaoOs,
	});
	app.get("/empresas/:idempresa/modelos-impressao-os/:id", {
		handler: buscarModeloImpressaoOs,
	});
	app.put("/empresas/:idempresa/modelos-impressao-os/:id", {
		handler: atualizarModeloImpressaoOs,
	});
	app.delete("/empresas/:idempresa/modelos-impressao-os/:id", {
		handler: excluirModeloImpressaoOs,
	});
	app.post("/empresas/:idempresa/modelos-impressao-os/:id/definir-primario", {
		handler: definirPrimarioModeloImpressaoOs,
	});
	app.post("/empresas/:idempresa/modelos-impressao-os/:id/duplicar", {
		handler: duplicarModeloImpressaoOs,
	});
}
