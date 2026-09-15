import type { FastifyInstance } from "fastify";
import { FEATURES_SAAS } from "@/constants/saas-catalog.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { requireFeature } from "../../middleware/verify-plano.js";
import {
	criarAjusteApuracaoEfd,
	excluirAjusteApuracaoEfd,
	listarAjustesApuracaoEfd,
} from "../apuracao-efd/ajustes.js";
import {
	gerarEfdContribuicoesSchema,
	gerarEfdIcmsSchema,
} from "./doc-schema/schema.js";
import { gerarEfdIcms } from "./gerar.js";
import { gerarEfdContribuicoes } from "./gerar-contribuicoes.js";

export async function efdRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireFeature(FEATURES_SAAS.SPED_EFD));

	app.post("/efd-icms/gerar", {
		schema: gerarEfdIcmsSchema,
		handler: gerarEfdIcms,
	});

	app.post("/efd-contribuicoes/gerar", {
		schema: gerarEfdContribuicoesSchema,
		handler: gerarEfdContribuicoes,
	});

	app.get("/efd/ajustes", { handler: listarAjustesApuracaoEfd });
	app.post("/efd/ajustes", { handler: criarAjusteApuracaoEfd });
	app.delete("/efd/ajustes/:id", { handler: excluirAjusteApuracaoEfd });
}
