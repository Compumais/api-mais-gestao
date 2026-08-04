import type { FastifyInstance } from "fastify";
import { MODULOS_SAAS } from "@/constants/saas-catalog.js";
import { requirePerfil } from "../../middleware/require-perfil.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { requireModulo } from "../../middleware/verify-plano.js";
import { buscarNfsePorId } from "./buscar-nfse-por-id.js";
import { cancelarNfse } from "./cancelar-nfse.js";
import { consultarNfse } from "./consultar-nfse.js";
import { emitirNfse } from "./emitir-nfse.js";
import { listarNfsesEmitidas } from "./listar-nfses-emitidas.js";
import { retransmitirNfse } from "./retransmitir-nfse.js";
import { substituirNfse } from "./substituir-nfse.js";

export async function nfseEmissaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireModulo(MODULOS_SAAS.NFSE));
	app.addHook(
		"onRequest",
		requirePerfil("proprietario", "admin", "financeiro"),
	);

	app.post("/nfse/emissao", { handler: emitirNfse });
	app.get("/nfse/emissao", { handler: listarNfsesEmitidas });
	app.get("/nfse/emissao/:id", { handler: buscarNfsePorId });
	app.post("/nfse/emissao/:id/cancelar", { handler: cancelarNfse });
	app.post("/nfse/emissao/:id/substituir", { handler: substituirNfse });
	app.post("/nfse/emissao/:id/consultar", { handler: consultarNfse });
	app.post("/nfse/emissao/:id/retransmitir", { handler: retransmitirNfse });
}
