import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarNfseSerie } from "./atualizar-nfse-serie.js";
import { criarNfseSerie } from "./criar-nfse-serie.js";
import { listarNfseSeries } from "./listar-nfse-series.js";

export async function nfseSerieRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/nfse-series", { handler: listarNfseSeries });
	app.post("/nfse-series", { handler: criarNfseSerie });
	app.put("/nfse-series/:id", { handler: atualizarNfseSerie });
}
