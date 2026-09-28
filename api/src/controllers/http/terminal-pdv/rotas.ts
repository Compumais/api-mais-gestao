import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { autenticarDevicePdv, gerarApiKeyTerminalPdv } from "./apikey.js";
import { buscarPdvFiscal } from "./pdv-fiscal.js";
import {
	atualizarTerminalPdv,
	criarTerminalPdv,
	excluirTerminalPdv,
	listarTerminaisPdv,
} from "./terminal-pdv.js";

export async function terminalPdvRotas(app: FastifyInstance) {
	app.post("/pdv/device/auth", { handler: autenticarDevicePdv });

	app.addHook("onRequest", async (request, reply) => {
		if (request.url.split("?")[0] === "/pdv/device/auth") {
			return;
		}
		return verifyJwt(request, reply);
	});

	app.get("/terminais-pdv", { handler: listarTerminaisPdv });
	app.post("/terminais-pdv", { handler: criarTerminalPdv });
	app.put("/terminais-pdv/:id", { handler: atualizarTerminalPdv });
	app.delete("/terminais-pdv/:id", { handler: excluirTerminalPdv });
	app.post("/terminais-pdv/:id/apikey", { handler: gerarApiKeyTerminalPdv });
	app.get("/empresas/:id/pdv-fiscal", {
		logLevel: "silent",
		handler: buscarPdvFiscal,
	});
}
