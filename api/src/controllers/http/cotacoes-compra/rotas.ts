import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarCotacaoCompra } from "./atualizar.js";
import { buscarCotacaoCompra } from "./buscar.js";
import {
	comparativoCotacaoCompra,
	gerarPedidosCotacaoCompra,
} from "./comparativo.js";
import { criarCotacaoCompra } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirCotacaoCompra } from "./excluir.js";
import { listarCotacoesCompra } from "./listar.js";
import {
	buscarCotacaoCompraPublica,
	enviarPropostaCotacaoCompra,
} from "./publico.js";
import {
	abrirCotacaoCompra,
	cancelarCotacaoCompra,
	encerrarCotacaoCompra,
} from "./status.js";

export async function cotacoesCompraRotas(app: FastifyInstance) {
	app.get("/cotacoes-compra/publico/:token", {
		schema: schema.buscarCotacaoPublicaSchema,
		handler: buscarCotacaoCompraPublica,
	});
	app.post("/cotacoes-compra/publico/:token/propostas", {
		schema: schema.enviarPropostaPublicaSchema,
		handler: enviarPropostaCotacaoCompra,
	});

	await app.register(async (authed) => {
		authed.addHook("onRequest", verifyJwt);

		authed.post("/cotacoes-compra", {
			schema: schema.criarCotacaoCompraSchema,
			handler: criarCotacaoCompra,
		});
		authed.get("/cotacoes-compra", {
			schema: schema.listarCotacoesCompraSchema,
			handler: listarCotacoesCompra,
		});
		authed.get("/cotacoes-compra/:id/comparativo", {
			schema: schema.comparativoCotacaoCompraSchema,
			handler: comparativoCotacaoCompra,
		});
		authed.post("/cotacoes-compra/:id/gerar-pedidos", {
			schema: schema.gerarPedidosCotacaoCompraSchema,
			handler: gerarPedidosCotacaoCompra,
		});
		authed.post("/cotacoes-compra/:id/abrir", {
			schema: schema.acaoCotacaoCompraSchema,
			handler: abrirCotacaoCompra,
		});
		authed.post("/cotacoes-compra/:id/encerrar", {
			schema: schema.acaoCotacaoCompraSchema,
			handler: encerrarCotacaoCompra,
		});
		authed.post("/cotacoes-compra/:id/cancelar", {
			schema: schema.acaoCotacaoCompraSchema,
			handler: cancelarCotacaoCompra,
		});
		authed.get("/cotacoes-compra/:id", {
			schema: schema.buscarCotacaoCompraSchema,
			handler: buscarCotacaoCompra,
		});
		authed.put("/cotacoes-compra/:id", {
			schema: schema.atualizarCotacaoCompraSchema,
			handler: atualizarCotacaoCompra,
		});
		authed.delete("/cotacoes-compra/:id", {
			schema: schema.excluirCotacaoCompraSchema,
			handler: excluirCotacaoCompra,
		});
	});
}
