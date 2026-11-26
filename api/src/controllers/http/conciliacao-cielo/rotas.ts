import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { associarItemConciliacaoCielo } from "./associar.js";
import { buscarConciliacaoCielo } from "./buscar.js";
import { confirmarConciliacaoCielo } from "./confirmar.js";
import { importarConciliacaoCielo } from "./importar.js";
import { listarConciliacoesCielo } from "./listar.js";

export async function conciliacaoCieloRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/conciliacoes-cielo", {
		handler: listarConciliacoesCielo,
	});
	app.post("/conciliacoes-cielo/importar", {
		handler: importarConciliacaoCielo,
	});
	app.get("/conciliacoes-cielo/:id", {
		handler: buscarConciliacaoCielo,
	});
	app.post("/conciliacoes-cielo/:id/confirmar", {
		handler: confirmarConciliacaoCielo,
	});
	app.put("/conciliacoes-cielo/itens/:iditem/associar", {
		handler: associarItemConciliacaoCielo,
	});
}
