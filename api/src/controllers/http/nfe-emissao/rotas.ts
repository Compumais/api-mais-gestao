import type { FastifyInstance } from "fastify";
import { FEATURES_SAAS } from "@/constants/saas-catalog.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { requireFeature } from "../../middleware/verify-plano.js";
import { cancelarNfe } from "./cancelar-nfe.js";
import { calcularObservacoesNfe } from "./calcular-observacoes.js";
import { calcularTributosNfe } from "./calcular-tributos.js";
import { emitirNfe, listarNfesEmitidas } from "./emitir-nfe.js";
import { inutilizarNfe } from "./inutilizar-nfe.js";
import {
	consultarStatusSefaz,
	emitirNfeHomologacaoTeste,
} from "./nfe-emissao.js";
import { previewDanfeNfe } from "./preview-danfe.js";
import { resolverReferenciaEmissao } from "./resolver-referencia.js";
import {
	excluirRascunhoEmissaoNfe,
	listarRascunhosEmissaoNfe,
	salvarRascunhoEmissaoNfe,
} from "./rascunho-emissao.js";
import { transmitirNfe } from "./transmitir-nfe.js";

export async function nfeEmissaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireFeature(FEATURES_SAAS.NOTAS_FISCAIS));

	app.post("/nfe/sefaz/status", { handler: consultarStatusSefaz });
	app.post("/nfe/homologacao/testar", {
		handler: emitirNfeHomologacaoTeste,
	});
	app.post("/nfe/emissao/resolver-referencia", {
		handler: resolverReferenciaEmissao,
	});
	app.post("/nfe/emissao/calcular-tributos", { handler: calcularTributosNfe });
	app.post("/nfe/emissao/calcular-observacoes", {
		handler: calcularObservacoesNfe,
	});
	app.post("/nfe/emissao/preview-danfe", { handler: previewDanfeNfe });
	app.post("/nfe/emissao/rascunho", { handler: salvarRascunhoEmissaoNfe });
	app.get("/nfe/emissao/rascunhos", { handler: listarRascunhosEmissaoNfe });
	app.delete("/nfe/emissao/rascunhos/:id", {
		handler: excluirRascunhoEmissaoNfe,
	});
	app.post("/nfe/emissao", { handler: emitirNfe });
	app.post("/nfe/emissao/:id/transmitir", { handler: transmitirNfe });
	app.post("/nfe/emissao/:id/cancelar", { handler: cancelarNfe });
	app.post("/nfe/emissao/:id/inutilizar", { handler: inutilizarNfe });
	app.get("/nfe/emissao", { handler: listarNfesEmitidas });
}
