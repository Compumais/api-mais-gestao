import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	buscarNfsePorId,
	cancelarNfse,
	consultarNfse,
	emitirNfse,
	listarNfsesEmitidas,
} from "./emitir-nfse.js";

export async function nfseEmissaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/nfse/emissao", { handler: emitirNfse });
	app.get("/nfse/emissao", { handler: listarNfsesEmitidas });
	app.get("/nfse/emissao/:id", { handler: buscarNfsePorId });
	app.post("/nfse/emissao/:id/cancelar", { handler: cancelarNfse });
	app.post("/nfse/emissao/:id/consultar", { handler: consultarNfse });
}
