import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { contratarPlanoController } from "./contratar.js";
import { upgradePlanoController } from "./upgrade.js";
import { downgradePlanoController } from "./downgrade.js";
import { getMeuPlanoController } from "./meu-plano.js";

export async function planosRotas(app: FastifyInstance) {
	// Todas as rotas de planos requerem autenticação
	app.addHook("onRequest", verifyJwt);

	// Primeira contratação de plano
	app.post("/planos/contratar", {
		handler: contratarPlanoController,
	});

	// Upgrade de plano
	app.post("/planos/upgrade", {
		handler: upgradePlanoController,
	});

	// Agendar downgrade
	app.post("/planos/downgrade", {
		handler: downgradePlanoController,
	});

	// Buscar plano do usuário autenticado
	app.get("/planos/meu-plano", {
		handler: getMeuPlanoController,
	});
}

