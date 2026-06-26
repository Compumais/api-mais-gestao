import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { baixarXmlNfeInbound } from "./baixar-xml.js";
import {
	baixarXmlNfeInboundSchema,
	diagnosticarChaveNfeInboundGetSchema,
	diagnosticarChaveNfeInboundPostSchema,
	importarDocumentoNfeInboundSchema,
	listarDocumentosNfeInboundSchema,
	manifestarCienciaNfeInboundSchema,
	obterStatusSyncNfeInboundSchema,
	sincronizarNfeInboundSchema,
} from "./doc-schema/schema.js";
import { diagnosticarChaveNfeInbound } from "./diagnosticar-chave.js";
import { importarDocumentoNfeInbound } from "./importar-documento.js";
import { listarDocumentosNfeInbound } from "./listar-documentos.js";
import { manifestarCienciaNfeInbound } from "./manifestar-ciencia.js";
import { obterStatusSyncNfeInbound } from "./obter-status-sync.js";
import { sincronizarNfeInbound } from "./sincronizar.js";

export async function nfeInboundRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/nfe-inbound/sync-status", {
		schema: obterStatusSyncNfeInboundSchema,
		handler: obterStatusSyncNfeInbound,
	});

	app.get("/nfe-inbound/documentos", {
		schema: listarDocumentosNfeInboundSchema,
		handler: listarDocumentosNfeInbound,
	});

	app.post("/nfe-inbound/sincronizar", {
		schema: sincronizarNfeInboundSchema,
		handler: sincronizarNfeInbound,
	});

	app.get("/nfe-inbound/diagnosticar-chave", {
		schema: diagnosticarChaveNfeInboundGetSchema,
		handler: diagnosticarChaveNfeInbound,
	});

	app.post("/nfe-inbound/diagnosticar-chave", {
		schema: diagnosticarChaveNfeInboundPostSchema,
		handler: diagnosticarChaveNfeInbound,
	});

	app.post("/nfe-inbound/documentos/:id/importar", {
		schema: importarDocumentoNfeInboundSchema,
		handler: importarDocumentoNfeInbound,
	});

	app.post("/nfe-inbound/documentos/:id/manifestar-ciencia", {
		schema: manifestarCienciaNfeInboundSchema,
		handler: manifestarCienciaNfeInbound,
	});

	app.get("/nfe-inbound/documentos/:id/xml", {
		schema: baixarXmlNfeInboundSchema,
		handler: baixarXmlNfeInbound,
	});
}
