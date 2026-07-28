import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	contratarModuloController,
	listarCatalogoPlanosController,
} from "./catalogo.js";
import { contratarPlanoController } from "./contratar.js";
import { downgradePlanoController } from "./downgrade.js";
import { getMeuPlanoController } from "./meu-plano.js";
import { upgradePlanoController } from "./upgrade.js";

export async function planosRotas(app: FastifyInstance) {
	app.get("/planos/catalogo", {
		handler: listarCatalogoPlanosController,
	});

	await app.register(async (autenticado) => {
		autenticado.addHook("onRequest", verifyJwt);

		autenticado.post("/planos/contratar", {
			handler: contratarPlanoController,
		});
		autenticado.post("/planos/upgrade", {
			handler: upgradePlanoController,
		});
		autenticado.post("/planos/downgrade", {
			handler: downgradePlanoController,
		});
		autenticado.post("/planos/modulos/contratar", {
			handler: contratarModuloController,
		});
		autenticado.get("/planos/meu-plano", {
			handler: getMeuPlanoController,
		});
	});
}
