import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	criarEventoOrdemServico,
	gerarContasReceberOrdemServico,
	gerarNfeRascunhoOrdemServico,
	listarEventosOrdemServico,
	listarFaturamentosOrdemServico,
} from "./acoes.js";
import { atualizarOrdemServico } from "./atualizar.js";
import { buscarOrdemServico } from "./buscar.js";
import { criarOrdemServico } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirOrdemServico } from "./excluir.js";
import {
	atualizarItemOrdemServico,
	criarItemOrdemServico,
	excluirItemOrdemServico,
	listarItensOrdemServico,
} from "./itens.js";
import { listarOrdemServicos } from "./listar.js";
import {
	atualizarLoteItemOrdemServico,
	criarLoteItemOrdemServico,
	excluirLoteItemOrdemServico,
	listarLotesItemOrdemServico,
} from "./lotes.js";

export async function ordensServicoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/ordens-servico", {
		schema: schema.criarOrdemServicoSchema,
		handler: criarOrdemServico,
	});
	app.get("/ordens-servico", {
		schema: schema.listarOrdemServicosSchema,
		handler: listarOrdemServicos,
	});
	app.get("/ordens-servico/:id", {
		schema: schema.buscarOrdemServicoSchema,
		handler: buscarOrdemServico,
	});
	app.put("/ordens-servico/:id", {
		schema: schema.atualizarOrdemServicoSchema,
		handler: atualizarOrdemServico,
	});
	app.delete("/ordens-servico/:id", {
		schema: schema.excluirOrdemServicoSchema,
		handler: excluirOrdemServico,
	});

	app.get("/ordens-servico/:id/itens", {
		schema: schema.listarItensOrdemServicoSchema,
		handler: listarItensOrdemServico,
	});
	app.post("/ordens-servico/:id/itens", {
		schema: schema.criarItemOrdemServicoSchema,
		handler: criarItemOrdemServico,
	});
	app.put("/ordens-servico/:id/itens/:iditem", {
		schema: schema.atualizarItemOrdemServicoSchema,
		handler: atualizarItemOrdemServico,
	});
	app.delete("/ordens-servico/:id/itens/:iditem", {
		schema: schema.excluirItemOrdemServicoSchema,
		handler: excluirItemOrdemServico,
	});

	app.get("/ordens-servico/:id/itens/:iditem/lotes", {
		schema: schema.listarLotesItemOrdemServicoSchema,
		handler: listarLotesItemOrdemServico,
	});
	app.post("/ordens-servico/:id/itens/:iditem/lotes", {
		schema: schema.criarLoteItemOrdemServicoSchema,
		handler: criarLoteItemOrdemServico,
	});
	app.put("/ordens-servico/:id/itens/:iditem/lotes/:idlote", {
		schema: schema.atualizarLoteItemOrdemServicoSchema,
		handler: atualizarLoteItemOrdemServico,
	});
	app.delete("/ordens-servico/:id/itens/:iditem/lotes/:idlote", {
		schema: schema.excluirLoteItemOrdemServicoSchema,
		handler: excluirLoteItemOrdemServico,
	});

	app.get("/ordens-servico/:id/eventos", {
		schema: schema.listarEventosOrdemServicoSchema,
		handler: listarEventosOrdemServico,
	});
	app.post("/ordens-servico/:id/eventos", {
		schema: schema.criarEventoOrdemServicoSchema,
		handler: criarEventoOrdemServico,
	});

	app.get("/ordens-servico/:id/faturamentos", {
		schema: schema.listarFaturamentosOrdemServicoSchema,
		handler: listarFaturamentosOrdemServico,
	});
	app.post("/ordens-servico/:id/contas-receber", {
		schema: schema.gerarContasReceberOrdemServicoSchema,
		handler: gerarContasReceberOrdemServico,
	});
	app.post("/ordens-servico/:id/gerar-nfe-rascunho", {
		schema: schema.gerarNfeRascunhoOrdemServicoSchema,
		handler: gerarNfeRascunhoOrdemServico,
	});
}
