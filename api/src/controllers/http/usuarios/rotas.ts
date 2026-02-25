import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarUsuario } from "./atualizar-usuario.js";
import { buscarUsuario } from "./buscar-usuario.js";
import { criarUsuario } from "./criar-usuario.js";
import { excluirUsuario } from "./excluir-usuario.js";
import { listarUsuarios } from "./listar-usuarios.js";

export async function usuariosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/usuarios", {
		handler: listarUsuarios,
	});

	app.get("/usuarios/:id", {
		handler: buscarUsuario,
	});

	app.post("/usuarios", {
		handler: criarUsuario,
	});

	app.put("/usuarios/:id", {
		handler: atualizarUsuario,
	});

	app.delete("/usuarios/:id", {
		handler: excluirUsuario,
	});
}
