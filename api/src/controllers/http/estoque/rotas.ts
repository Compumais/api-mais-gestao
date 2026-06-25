import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	baixaEstoqueVenda,
	listarMovimentosEstoqueGestao,
	listarSaldosEstoqueGestao,
} from "./estoque.js";

export async function estoqueRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/estoque/saldos", listarSaldosEstoqueGestao);
	app.get("/estoque/movimentos", listarMovimentosEstoqueGestao);
	app.post("/estoque/baixa-venda", baixaEstoqueVenda);
}
