import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarConfiguracaoSmtp } from "./buscar-smtp.js";
import { enviarEmail } from "./enviar.js";
import { salvarConfiguracaoSmtp } from "./salvar-smtp.js";
import { testarSmtp } from "./testar-smtp.js";

export async function emailRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/emails/smtp", {
		handler: buscarConfiguracaoSmtp,
	});
	app.put("/emails/smtp", {
		handler: salvarConfiguracaoSmtp,
	});
	app.post("/emails/smtp/testar", {
		handler: testarSmtp,
	});
	app.post("/emails/enviar", {
		handler: enviarEmail,
	});
}
