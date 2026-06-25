import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarEmpresaFiscal,
	buscarEmpresaFiscal,
} from "./empresa-fiscal.js";

export async function empresaFiscalRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/empresas/:id/fiscal", { handler: buscarEmpresaFiscal });
	app.put("/empresas/:id/fiscal", { handler: atualizarEmpresaFiscal });
}
