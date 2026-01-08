import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarPlanoContas } from "./atualizar.js";
import { buscarPlanoContas } from "./buscar.js";
import { criarPlanoContas } from "./criar.js";
import { excluirPlanoContas } from "./excluir.js";
import { listarPlanoContas } from "./listar.js";

export function planoContasRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/plano-contas", async (request, reply) => {
		await criarPlanoContas(request, reply);
	});

	app.get("/plano-contas", async (request, reply) => {
		await listarPlanoContas(request, reply);
	});

	app.get("/plano-contas/:id", async (request, reply) => {
		await buscarPlanoContas(request, reply);
	});

	app.put("/plano-contas/:id", async (request, reply) => {
		await atualizarPlanoContas(request, reply);
	});

	app.delete("/plano-contas/:id", async (request, reply) => {
		await excluirPlanoContas(request, reply);
	});
}
