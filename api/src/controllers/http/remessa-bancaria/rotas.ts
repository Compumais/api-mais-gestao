import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { baixarRemessaBancaria } from "./baixar.js";
import { buscarRemessaBancaria } from "./buscar.js";
import { gerarRemessaBancaria } from "./gerar.js";
import { listarRemessasBancarias } from "./listar.js";
import { marcarRemessaEnviada } from "./marcar-enviada.js";

export async function remessaBancariaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/remessas-bancarias", {
		handler: listarRemessasBancarias,
	});
	app.post("/remessas-bancarias/gerar", {
		handler: gerarRemessaBancaria,
	});
	app.get("/remessas-bancarias/:id", {
		handler: buscarRemessaBancaria,
	});
	app.get("/remessas-bancarias/:id/download", {
		handler: baixarRemessaBancaria,
	});
	app.post("/remessas-bancarias/:id/marcar-enviada", {
		handler: marcarRemessaEnviada,
	});
}
