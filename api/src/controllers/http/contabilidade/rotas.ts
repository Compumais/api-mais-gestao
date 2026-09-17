import type { FastifyInstance } from "fastify";
import { resolveEmpresaContext } from "../../middleware/resolve-empresa-context.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	buscarCadastroContabilidade,
	salvarCadastroContabilidade,
} from "./cadastro.js";
import { exportarXmlsContabilidadeSchema } from "./doc-schema/schema.js";
import { exportarXmlsContabilidade } from "./exportar-xmls.js";

export async function contabilidadeRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/contabilidade/cadastro", {
		preHandler: [resolveEmpresaContext],
		handler: buscarCadastroContabilidade,
	});
	app.put("/contabilidade/cadastro", {
		preHandler: [resolveEmpresaContext],
		handler: salvarCadastroContabilidade,
	});
	app.post("/contabilidade/exportar-xmls", {
		schema: exportarXmlsContabilidadeSchema,
		preHandler: [resolveEmpresaContext],
		handler: exportarXmlsContabilidade,
	});
}
