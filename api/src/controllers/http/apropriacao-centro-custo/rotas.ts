import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarApropriacaoManual } from "./criar-manual.js";
import { listarApropriacoesPorOrigemHandler } from "./listar-por-origem.js";
import { listarPendentesHandler } from "./listar-pendentes.js";
import { reclassificarApropriacaoHandler } from "./reclassificar.js";
import { salvarApropriacaoHandler } from "./salvar.js";

export async function apropriacaoCentroCustoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/apropriacoes-centro-custo", {
		handler: listarApropriacoesPorOrigemHandler,
	});
	app.post("/apropriacoes-centro-custo", {
		handler: salvarApropriacaoHandler,
	});
	app.put("/apropriacoes-centro-custo/reclassificar", {
		handler: reclassificarApropriacaoHandler,
	});
	app.get("/apropriacoes-centro-custo/pendentes", {
		handler: listarPendentesHandler,
	});
	app.post("/apropriacoes-centro-custo/manual", {
		handler: criarApropriacaoManual,
	});
}
