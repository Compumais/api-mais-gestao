import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarGrupoGourmet } from "./atualizar.js";
import { buscarGrupoGourmet } from "./buscar.js";
import { criarGrupoGourmet } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirGrupoGourmet } from "./excluir.js";
import {
	deleteImagemGrupoGourmet,
	downloadImagemGrupoGourmet,
	uploadImagemGrupoGourmet,
} from "./imagem.js";
import { listarGruposGourmet } from "./listar.js";

const LIMITE_IMAGEM = 5 * 1024 * 1024;
const ID_UUID_PARAM =
	":id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})";

export async function gruposGourmetRotas(app: FastifyInstance) {
	app.addContentTypeParser(
		["image/jpeg", "image/png", "image/webp"],
		{ parseAs: "buffer", bodyLimit: LIMITE_IMAGEM },
		(_request, body, done) => done(null, body),
	);
	app.addHook("onRequest", verifyJwt);

	app.post("/grupos-gourmet", {
		schema: schema.criarGrupoGourmetSchema,
		handler: criarGrupoGourmet,
	});
	app.get("/grupos-gourmet", {
		schema: schema.listarGruposGourmetSchema,
		handler: listarGruposGourmet,
	});
	app.get("/grupos-gourmet/:id", {
		schema: schema.buscarGrupoGourmetSchema,
		handler: buscarGrupoGourmet,
	});
	app.get(`/grupos-gourmet/${ID_UUID_PARAM}/imagem`, {
		handler: downloadImagemGrupoGourmet,
	});
	app.put(`/grupos-gourmet/${ID_UUID_PARAM}/imagem`, {
		bodyLimit: LIMITE_IMAGEM,
		handler: uploadImagemGrupoGourmet,
	});
	app.delete(`/grupos-gourmet/${ID_UUID_PARAM}/imagem`, {
		handler: deleteImagemGrupoGourmet,
	});
	app.put("/grupos-gourmet/:id", {
		schema: schema.atualizarGrupoGourmetSchema,
		handler: atualizarGrupoGourmet,
	});
	app.delete("/grupos-gourmet/:id", {
		schema: schema.excluirGrupoGourmetSchema,
		handler: excluirGrupoGourmet,
	});
}
