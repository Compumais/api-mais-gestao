import type { FastifyInstance } from "fastify";
import { FEATURES_SAAS } from "@/constants/saas-catalog.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { requireFeature } from "../../middleware/verify-plano.js";
import {
	atualizarVendaNfce,
	buscarCupomNfce,
	buscarNfceParaEditar,
	inutilizarNfceVenda,
	listarNfcePendentes,
	reemitirNfce,
	retransmitirNfceVenda,
	transmitirNfceContingencia,
} from "./nfce.js";

export async function nfceRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireFeature(FEATURES_SAAS.NOTAS_FISCAIS));

	app.get("/nfce/pendentes", listarNfcePendentes);
	app.post("/nfce/venda/:idvenda/retransmitir", retransmitirNfceVenda);
	app.post("/nfce/venda/:idvenda/inutilizar", inutilizarNfceVenda);
	app.post("/nfce/contingencia/transmitir", transmitirNfceContingencia);
	app.get("/nfce/:idnotafiscal/cupom", buscarCupomNfce);
	app.get("/nfce/:idnotafiscal/editar", buscarNfceParaEditar);
	app.put("/nfce/:idnotafiscal/venda", atualizarVendaNfce);
	app.post("/nfce/:idnotafiscal/reemitir", reemitirNfce);
}
