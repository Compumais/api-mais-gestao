import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	lerImagemCardapioPublica,
	removerImagemCardapioDelivery,
	salvarImagemCardapioDelivery,
} from "@/service/cardapio-delivery/imagem-cardapio-delivery.js";
import { ErroImagemProduto } from "@/service/produto/imagem-produto.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({ idempresa: z.string().min(1) });
const tipoSchema = z.object({
	tipo: z.enum(["logo", "banner"]),
});
const slugSchema = z.object({
	slug: z.string().min(2),
});

function responderErro(erro: unknown, reply: FastifyReply) {
	if (erro instanceof ErroImagemProduto) {
		return reply
			.status(erro.status)
			.send({ error: erro.message, code: erro.codigo });
	}
	if (erro instanceof z.ZodError) {
		return reply.status(400).send({
			error: "Erro de validação",
			code: "VALIDATION_ERROR",
			details: erro.issues,
		});
	}
	console.error(erro);
	return reply.status(httpErroInterno().status).send(httpErroInterno());
}

export async function uploadImagemCardapioDelivery(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = querySchema.parse(request.query);
		const { tipo } = tipoSchema.parse(request.params);
		if (!Buffer.isBuffer(request.body)) {
			throw new ErroImagemProduto(
				"Conteúdo da imagem não informado",
				400,
				"IMAGEM_AUSENTE",
			);
		}
		return reply.status(200).send(
			await salvarImagemCardapioDelivery({
				idempresa,
				idusuario: request.user.id,
				tipo,
				conteudo: request.body,
				tipoInformado: request.headers["content-type"]?.split(";")[0],
			}),
		);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}

export async function deleteImagemCardapioDelivery(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { idempresa } = querySchema.parse(request.query);
		const { tipo } = tipoSchema.parse(request.params);
		return reply.status(200).send(
			await removerImagemCardapioDelivery({
				idempresa,
				idusuario: request.user.id,
				tipo,
			}),
		);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}

export async function downloadImagemCardapioPublica(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { slug } = slugSchema.parse(request.params);
		const segmento = request.url.split("?")[0]?.split("/").pop();
		const tipo = tipoSchema.parse({ tipo: segmento }).tipo;
		const imagem = await lerImagemCardapioPublica({ slug, tipo });
		return reply
			.type(imagem.tipo)
			.header("Cache-Control", "public, max-age=31536000, immutable")
			.header("ETag", `"${imagem.etag}"`)
			.send(imagem.conteudo);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}
