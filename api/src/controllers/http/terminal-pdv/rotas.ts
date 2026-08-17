import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarPdvFiscal } from "./pdv-fiscal.js";
import {
	atualizarTerminalPdv,
	criarTerminalPdv,
	excluirTerminalPdv,
	listarTerminaisPdv,
} from "./terminal-pdv.js";

export async function terminalPdvRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/terminais-pdv", { handler: listarTerminaisPdv });
	app.post("/terminais-pdv", { handler: criarTerminalPdv });
	app.put("/terminais-pdv/:id", { handler: atualizarTerminalPdv });
	app.delete("/terminais-pdv/:id", { handler: excluirTerminalPdv });
	app.get("/empresas/:id/pdv-fiscal", {
		logLevel: "silent",
		handler: buscarPdvFiscal,
	});
}
