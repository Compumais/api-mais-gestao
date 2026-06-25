import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	consultarStatusSefaz,
	emitirNfeHomologacaoTeste,
} from "./nfe-emissao.js";
import { emitirNfe, listarNfesEmitidas } from "./emitir-nfe.js";
import { transmitirNfe } from "./transmitir-nfe.js";
import { cancelarNfe } from "./cancelar-nfe.js";
import { inutilizarNfe } from "./inutilizar-nfe.js";
import { resolverReferenciaEmissao } from "./resolver-referencia.js";

export async function nfeEmissaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/nfe/sefaz/status", { handler: consultarStatusSefaz });
	app.post("/nfe/homologacao/testar", {
		handler: emitirNfeHomologacaoTeste,
	});
	app.post("/nfe/emissao/resolver-referencia", {
		handler: resolverReferenciaEmissao,
	});
	app.post("/nfe/emissao", { handler: emitirNfe });
	app.post("/nfe/emissao/:id/transmitir", { handler: transmitirNfe });
	app.post("/nfe/emissao/:id/cancelar", { handler: cancelarNfe });
	app.post("/nfe/emissao/:id/inutilizar", { handler: inutilizarNfe });
	app.get("/nfe/emissao", { handler: listarNfesEmitidas });
}
