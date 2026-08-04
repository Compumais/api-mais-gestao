import type { FastifyInstance } from "fastify";
import { requirePerfil } from "../../middleware/require-perfil.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarUsuario } from "./atualizar-usuario.js";
import { buscarUsuario } from "./buscar-usuario.js";
import { criarUsuario } from "./criar-usuario.js";
import { excluirUsuario } from "./excluir-usuario.js";
import { listarUsuarios } from "./listar-usuarios.js";

export async function usuariosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/usuarios", {
		onRequest: [
			requirePerfil("proprietario", "admin", "financeiro", "usuario"),
		],
		handler: listarUsuarios,
	});

	app.get("/usuarios/:id", {
		onRequest: [requirePerfil("proprietario", "admin")],
		handler: buscarUsuario,
	});

	app.post("/usuarios", {
		onRequest: [requirePerfil("proprietario", "admin")],
		handler: criarUsuario,
	});

	app.put("/usuarios/:id", {
		onRequest: [requirePerfil("proprietario", "admin")],
		handler: atualizarUsuario,
	});

	app.delete("/usuarios/:id", {
		onRequest: [requirePerfil("proprietario", "admin")],
		handler: excluirUsuario,
	});
}
