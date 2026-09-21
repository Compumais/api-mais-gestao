import type { FastifyInstance } from "fastify";
import { MODULOS_SAAS } from "@/constants/saas-catalog.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { requireModulo } from "../../middleware/verify-plano.js";
import { ackPedidoCardapioDelivery } from "./ack.js";
import { atualizarCardapioDelivery } from "./atualizar.js";
import { buscarCardapioDelivery } from "./buscar.js";
import * as schema from "./doc-schema/schema.js";
import {
	deleteImagemCardapioDelivery,
	downloadImagemCardapioPublica,
	uploadImagemCardapioDelivery,
} from "./imagem.js";
import { listarPedidosCardapioPendentes } from "./pendentes.js";
import {
	buscarCardapioPublico,
	buscarProdutosCardapioPublico,
	criarPedidoCardapioPublico,
	downloadImagemGrupoCardapioPublica,
	downloadImagemProdutoCardapioPublica,
} from "./publico.js";

const LIMITE_IMAGEM = 5 * 1024 * 1024;
const ID_UUID_PARAM =
	":id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})";

export async function cardapioDeliveryRotas(app: FastifyInstance) {
	app.addContentTypeParser(
		["image/jpeg", "image/png", "image/webp"],
		{ parseAs: "buffer", bodyLimit: LIMITE_IMAGEM },
		(_request, body, done) => done(null, body),
	);

	app.get("/publico/cardapio/:slug", {
		schema: schema.buscarCardapioPublicoSchema,
		handler: buscarCardapioPublico,
	});
	app.get("/publico/cardapio/:slug/produtos", {
		schema: schema.buscarProdutosCardapioPublicoSchema,
		handler: buscarProdutosCardapioPublico,
	});
	app.post("/publico/cardapio/:slug/pedidos", {
		schema: schema.criarPedidoCardapioPublicoSchema,
		handler: criarPedidoCardapioPublico,
	});
	app.get("/publico/cardapio/:slug/logo", {
		handler: downloadImagemCardapioPublica,
	});
	app.get("/publico/cardapio/:slug/banner", {
		handler: downloadImagemCardapioPublica,
	});
	app.get(`/publico/cardapio/:slug/produtos/${ID_UUID_PARAM}/imagem`, {
		handler: downloadImagemProdutoCardapioPublica,
	});
	app.get(`/publico/cardapio/:slug/grupos/${ID_UUID_PARAM}/imagem`, {
		handler: downloadImagemGrupoCardapioPublica,
	});

	await app.register(async (authed) => {
		authed.addHook("onRequest", verifyJwt);
		authed.addHook("onRequest", requireModulo(MODULOS_SAAS.GOURMET));

		authed.get("/cardapio-delivery", {
			schema: schema.buscarCardapioDeliverySchema,
			handler: buscarCardapioDelivery,
		});
		authed.put("/cardapio-delivery", {
			schema: schema.atualizarCardapioDeliverySchema,
			handler: atualizarCardapioDelivery,
		});
		authed.put("/cardapio-delivery/:tipo(logo|banner)", {
			bodyLimit: LIMITE_IMAGEM,
			handler: uploadImagemCardapioDelivery,
		});
		authed.delete("/cardapio-delivery/:tipo(logo|banner)", {
			handler: deleteImagemCardapioDelivery,
		});
		authed.get("/cardapio-delivery/pedidos-pendentes", {
			schema: schema.listarPedidosPendentesSchema,
			handler: listarPedidosCardapioPendentes,
		});
		authed.post(`/cardapio-delivery/pedidos/${ID_UUID_PARAM}/ack`, {
			schema: schema.ackPedidoCardapioSchema,
			handler: ackPedidoCardapioDelivery,
		});
	});
}
