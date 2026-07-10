import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarAutomacao,
	criarAutomacao,
	excluirAutomacao,
	executarAutomacao,
	listarAutomacoes,
	listarExecucoesAutomacao,
} from "./automacao.js";

export async function automacaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/automacoes", { handler: listarAutomacoes });
	app.post("/automacoes", { handler: criarAutomacao });
	app.put("/automacoes/:id", { handler: atualizarAutomacao });
	app.delete("/automacoes/:id", { handler: excluirAutomacao });
	app.post("/automacoes/:id/executar", { handler: executarAutomacao });
	app.get("/automacoes/:id/execucoes", { handler: listarExecucoesAutomacao });
}
