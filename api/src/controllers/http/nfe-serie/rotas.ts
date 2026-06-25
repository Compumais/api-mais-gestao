import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarNfeSerie,
	criarNfeSerie,
	listarNfeSeries,
} from "./nfe-serie.js";

export async function nfeSerieRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/nfe-series", { handler: listarNfeSeries });
	app.post("/nfe-series", { handler: criarNfeSerie });
	app.put("/nfe-series/:id", { handler: atualizarNfeSerie });
}
