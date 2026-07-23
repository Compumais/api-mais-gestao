import type { FastifyInstance } from "fastify";

import { verifyJwt } from "../../middleware/verify-jwt.js";

import {

	atualizarItemRascunhoImportacao,

	atualizarRascunhoImportacao,

} from "./atualizar-rascunho.js";

import { aplicarGrupoPadraoRascunhoImportacao } from "./aplicar-grupo-padrao-rascunho.js";

import { atualizarNotaFiscal } from "./atualizar.js";
import { atualizarNotaFiscalCompra } from "./atualizar-compra.js";
import { buscarRascunhoImportacao } from "./buscar-rascunho.js";
import { buscarNotaFiscal } from "./buscar.js";
import { baixarXmlNotaFiscal } from "./baixar-xml.js";
import { cancelarNotaFiscalCompra } from "./cancelar-compra.js";
import { gerarDanfeNotaFiscal } from "./gerar-danfe.js";
import { enviarEmailNotaFiscal } from "./enviar-email.js";
import { buscarProdutoParaNF } from "./buscar-produto.js";
import { criarRascunhoImportacaoXml } from "./criar-rascunho-xml.js";
import { importarNotaFiscalPorChave } from "./importar-por-chave.js";
import { criarNotaFiscal } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirNotaFiscal } from "./excluir.js";
import {
	excluirRascunhoImportacao,
	finalizarRascunhoImportacao,
} from "./finalizar-rascunho.js";
import { importarXmlNF } from "./importar-xml.js";
import { listarRascunhosImportacao } from "./listar-rascunhos.js";
import { listarNotasFiscais } from "./listar.js";

export async function notasFiscaisRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/notas-fiscais", {
		schema: schema.criarNotaFiscalSchema,
		handler: criarNotaFiscal,
	});

	app.post("/notas-fiscais/importar-xml/rascunho", {
		schema: schema.criarRascunhoImportacaoXmlSchema,
		handler: criarRascunhoImportacaoXml,
	});

	app.post("/notas-fiscais/importar-xml/chave", {
		schema: schema.importarNotaFiscalPorChaveSchema,
		handler: importarNotaFiscalPorChave,
	});

	app.post("/notas-fiscais/importar-xml", {
		schema: schema.importarXmlNFSchema,
		handler: importarXmlNF,
	});

	app.get("/notas-fiscais/rascunhos", {
		schema: schema.listarRascunhosImportacaoSchema,
		handler: listarRascunhosImportacao,
	});

	app.get("/notas-fiscais/rascunhos/:id", {
		schema: schema.buscarRascunhoImportacaoSchema,
		handler: buscarRascunhoImportacao,
	});

	app.patch("/notas-fiscais/rascunhos/:id", {
		schema: schema.atualizarRascunhoImportacaoSchema,
		handler: atualizarRascunhoImportacao,
	});

	app.patch("/notas-fiscais/rascunhos/:id/itens/:idItem", {
		schema: schema.atualizarItemRascunhoImportacaoSchema,
		handler: atualizarItemRascunhoImportacao,
	});

	app.post("/notas-fiscais/rascunhos/:id/grupo-padrao", {
		schema: schema.aplicarGrupoPadraoRascunhoImportacaoSchema,
		handler: aplicarGrupoPadraoRascunhoImportacao,
	});

	app.post("/notas-fiscais/rascunhos/:id/finalizar", {
		schema: schema.finalizarRascunhoImportacaoSchema,
		handler: finalizarRascunhoImportacao,
	});

	app.delete("/notas-fiscais/rascunhos/:id", {
		schema: schema.excluirRascunhoImportacaoSchema,
		handler: excluirRascunhoImportacao,
	});

	app.get("/notas-fiscais", {
		schema: schema.listarNotasFiscaisSchema,
		handler: listarNotasFiscais,
	});

	app.get("/notas-fiscais/produtos/buscar", {
		schema: schema.buscarProdutoNFSchema,
		handler: buscarProdutoParaNF,
	});

	app.get("/notas-fiscais/:id", {
		schema: schema.buscarNotaFiscalSchema,
		handler: buscarNotaFiscal,
	});

	app.get("/notas-fiscais/:id/danfe", {
		handler: gerarDanfeNotaFiscal,
	});

	app.get("/notas-fiscais/:id/xml", {
		handler: baixarXmlNotaFiscal,
	});

	app.post("/notas-fiscais/:id/enviar-email", {
		handler: enviarEmailNotaFiscal,
	});

	app.put("/notas-fiscais/:id/compra", {
		schema: schema.atualizarNotaFiscalCompraSchema,
		handler: atualizarNotaFiscalCompra,
	});

	app.post("/notas-fiscais/:id/cancelar", {
		schema: schema.cancelarNotaFiscalCompraSchema,
		handler: cancelarNotaFiscalCompra,
	});

	app.put("/notas-fiscais/:id", {
		schema: schema.atualizarNotaFiscalSchema,
		handler: atualizarNotaFiscal,
	});

	app.delete("/notas-fiscais/:id", {
		schema: schema.excluirNotaFiscalSchema,
		handler: excluirNotaFiscal,
	});
}


