import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	buscarCadastroContabilidade,
	salvarCadastroContabilidade,
} from "./cadastro.js";
import { exportarXmlsContabilidade } from "./exportar-xmls.js";
import { exportarXmlsContabilidadeSchema } from "./doc-schema/schema.js";

export async function contabilidadeRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/contabilidade/cadastro", {
		handler: buscarCadastroContabilidade,
	});
	app.put("/contabilidade/cadastro", {
		handler: salvarCadastroContabilidade,
	});
	app.post("/contabilidade/exportar-xmls", {
		schema: exportarXmlsContabilidadeSchema,
		handler: exportarXmlsContabilidade,
	});
}
