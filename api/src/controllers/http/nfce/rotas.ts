import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { listarNfcePendentes, reemitirNfce } from "./nfce.js";

export async function nfceRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/nfce/pendentes", listarNfcePendentes);
	app.post("/nfce/:idnotafiscal/reemitir", reemitirNfce);
}
