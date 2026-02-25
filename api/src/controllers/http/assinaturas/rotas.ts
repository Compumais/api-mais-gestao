import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { checkoutController } from "./checkout.js";
import {
	cancelarAssinaturaController,
	getMeuPlanoController,
} from "./meus-planos.js";
import { webhookController } from "./webhook.js";

export async function assinaturasRotas(app: FastifyInstance) {
	// Rota de Checkout (Protegida)
	app.post("/checkout/assinatura", {
		preHandler: [verifyJwt],
		handler: checkoutController,
	});

	// Rota de Meus Planos (Protegida)
	app.get("/assinaturas/meu-plano", {
		preHandler: [verifyJwt],
		handler: getMeuPlanoController,
	});

	// Rota de Cancelar Assinatura (Protegida)
	app.post("/assinaturas/cancelar", {
		preHandler: [verifyJwt],
		handler: cancelarAssinaturaController,
	});

	// Rota de Webhook (Publica - Validação via Token interno se necessário)
	app.post("/webhook/asaas", {
		handler: webhookController,
	});
}
