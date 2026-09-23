import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import * as schema from "./doc-schema/schema.js";
import { listarClassificacoesIbsCbsHttp } from "./listar-classificacoes.js";
import { listarCstIbsCbsHttp } from "./listar-cst.js";

export async function ibsCbsRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/ibscbs/cst", {
		schema: schema.listarCstIbsCbsSchema,
		handler: listarCstIbsCbsHttp,
	});
	app.get("/ibscbs/classificacoes", {
		schema: schema.listarClassificacoesIbsCbsSchema,
		handler: listarClassificacoesIbsCbsHttp,
	});
}
