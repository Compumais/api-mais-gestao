import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { emitirNfse } from "./emitir-nfse.js";
import { listarNfsesEmitidas } from "./listar-nfses-emitidas.js";
import { buscarNfsePorId } from "./buscar-nfse-por-id.js";
import { cancelarNfse } from "./cancelar-nfse.js";
import { substituirNfse } from "./substituir-nfse.js";
import { consultarNfse } from "./consultar-nfse.js";
import { retransmitirNfse } from "./retransmitir-nfse.js";

export async function nfseEmissaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/nfse/emissao", { handler: emitirNfse });
	app.get("/nfse/emissao", { handler: listarNfsesEmitidas });
	app.get("/nfse/emissao/:id", { handler: buscarNfsePorId });
	app.post("/nfse/emissao/:id/cancelar", { handler: cancelarNfse });
	app.post("/nfse/emissao/:id/substituir", { handler: substituirNfse });
	app.post("/nfse/emissao/:id/consultar", { handler: consultarNfse });
	app.post("/nfse/emissao/:id/retransmitir", { handler: retransmitirNfse });
}
