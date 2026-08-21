import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	ajustarEstoqueEmMassa,
	baixaEstoqueVenda,
	listarMovimentosEstoqueGestao,
	listarSaldosEstoqueGestao,
} from "./estoque.js";
import { criarLote, listarLotes, sugerirLotesFefo } from "./lotes.js";

export async function estoqueRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/estoque/saldos", listarSaldosEstoqueGestao);
	app.get("/estoque/movimentos", listarMovimentosEstoqueGestao);
	app.post("/estoque/baixa-venda", baixaEstoqueVenda);
	app.post("/estoque/ajustes", ajustarEstoqueEmMassa);
	app.get("/lotes", listarLotes);
	app.post("/lotes", criarLote);
	app.post("/lotes/sugerir-fefo", sugerirLotesFefo);
}
