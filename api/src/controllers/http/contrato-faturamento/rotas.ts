import type { FastifyInstance } from "fastify";
import { MODULOS_SAAS } from "@/constants/saas-catalog.js";
import { requireModulo } from "../../middleware/verify-plano.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarLoteFaturamento } from "./buscar-lote.js";
import { confirmarLoteFaturamento } from "./confirmar-lote.js";
import { listarCobrancasFaturamento } from "./listar-cobrancas.js";
import { listarElegiveisFaturamento } from "./listar-elegiveis.js";
import { listarLotesFaturamento } from "./listar-lotes.js";
import { retomarCobrancaFaturamento } from "./retomar-cobranca.js";

export async function contratoFaturamentoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireModulo(MODULOS_SAAS.CONTRATOS));

	app.get("/contratos/faturamento/elegiveis", {
		handler: listarElegiveisFaturamento,
	});
	app.post("/contratos/faturamento/lotes", {
		handler: confirmarLoteFaturamento,
	});
	app.get("/contratos/faturamento/lotes", {
		handler: listarLotesFaturamento,
	});
	app.get("/contratos/faturamento/lotes/:id", {
		handler: buscarLoteFaturamento,
	});
	app.get("/contratos/faturamento/cobrancas", {
		handler: listarCobrancasFaturamento,
	});
	app.post("/contratos/faturamento/cobrancas/:id/retomar", {
		handler: retomarCobrancaFaturamento,
	});
}
