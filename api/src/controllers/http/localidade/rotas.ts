import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarEnderecoPorCep } from "./buscar-endereco-por-cep.js";
import * as schema from "./doc-schema/schema.js";
import { listarEstados } from "./listar-estados.js";
import { listarMunicipios } from "./listar-municipios.js";

export async function localidadesRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/localidades/estados", {
		schema: schema.listarEstadosSchema,
		handler: listarEstados,
	});

	app.get("/localidades/estados/:uf/municipios", {
		schema: schema.listarMunicipiosSchema,
		handler: listarMunicipios,
	});

	app.get("/localidades/cep/:cep", {
		schema: schema.buscarEnderecoPorCepSchema,
		handler: buscarEnderecoPorCep,
	});
}
