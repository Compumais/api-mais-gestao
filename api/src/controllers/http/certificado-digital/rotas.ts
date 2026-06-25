import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	ativarCertificadoDigital,
	criarCertificadoDigital,
	excluirCertificadoDigital,
	listarCertificadosDigitais,
} from "./certificado-digital.js";

export async function certificadoDigitalRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/certificados-digitais", { handler: listarCertificadosDigitais });
	app.post("/certificados-digitais", { handler: criarCertificadoDigital });
	app.post("/certificados-digitais/:id/ativar", {
		handler: ativarCertificadoDigital,
	});
	app.delete("/certificados-digitais/:id", {
		handler: excluirCertificadoDigital,
	});
}
