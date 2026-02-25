import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { chatComAtena } from "./chat.js";
import * as schema from "./doc-schema/schema.js";

export async function iaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/ia/chat", {
		schema: schema.chatComAtenaSchema,
		handler: chatComAtena,
	});
}
