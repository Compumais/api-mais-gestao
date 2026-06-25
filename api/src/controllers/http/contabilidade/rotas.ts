import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { exportarXmlsContabilidade } from "./exportar-xmls.js";
import { exportarXmlsContabilidadeSchema } from "./doc-schema/schema.js";

export async function contabilidadeRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/contabilidade/exportar-xmls", {
		schema: exportarXmlsContabilidadeSchema,
		handler: exportarXmlsContabilidade,
	});
}
