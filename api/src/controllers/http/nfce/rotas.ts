import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarVendaNfce,
	buscarCupomNfce,
	buscarNfceParaEditar,
	listarNfcePendentes,
	reemitirNfce,
} from "./nfce.js";

export async function nfceRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/nfce/pendentes", listarNfcePendentes);
	app.get("/nfce/:idnotafiscal/cupom", buscarCupomNfce);
	app.get("/nfce/:idnotafiscal/editar", buscarNfceParaEditar);
	app.put("/nfce/:idnotafiscal/venda", atualizarVendaNfce);
	app.post("/nfce/:idnotafiscal/reemitir", reemitirNfce);
}
