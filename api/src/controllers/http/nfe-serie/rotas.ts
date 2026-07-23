import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { listarNfeSeries } from "./listar-nfe-series.js";
import { criarNfeSerie } from "./criar-nfe-serie.js";
import { atualizarNfeSerie } from "./atualizar-nfe-serie.js";
import { excluirNfeSerie } from "./exluir-nfe-serie.js";

export async function nfeSerieRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/nfe-series", { handler: listarNfeSeries });
	app.post("/nfe-series", { handler: criarNfeSerie });
	app.put("/nfe-series/:id", { handler: atualizarNfeSerie });
	app.delete("/nfe-series/:id", { handler: excluirNfeSerie });
}
