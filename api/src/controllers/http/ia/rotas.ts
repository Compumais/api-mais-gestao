import type { FastifyInstance } from "fastify";
import { MODULOS_SAAS } from "@/constants/saas-catalog.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { requireModulo } from "../../middleware/verify-plano.js";
import { chatComAtena } from "./chat.js";
import * as schema from "./doc-schema/schema.js";

export async function iaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireModulo(MODULOS_SAAS.IA_FINANCEIRA));

	app.post("/ia/chat", {
		schema: schema.chatComAtenaSchema,
		handler: chatComAtena,
	});
}
