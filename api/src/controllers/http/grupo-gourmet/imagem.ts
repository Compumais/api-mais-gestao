import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	lerImagemGrupoGourmet,
	removerImagemGrupoGourmet,
	salvarImagemGrupoGourmet,
} from "@/service/grupo-gourmet/imagem-grupo-gourmet.js";
import { ErroImagemProduto } from "@/service/produto/imagem-produto.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.uuid() });

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

export async function uploadImagemGrupoGourmet(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user)
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		const { id } = paramsSchema.parse(request.params);
		if (!Buffer.isBuffer(request.body)) {
			throw new ErroImagemProduto(
				"Conteúdo da imagem não informado",
				400,
				"IMAGEM_AUSENTE",
			);
		}
		return reply.status(200).send(
			await salvarImagemGrupoGourmet({
				id,
				idusuario: request.user.id,
				conteudo: request.body,
				tipoInformado: request.headers["content-type"]?.split(";")[0],
			}),
		);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}

export async function downloadImagemGrupoGourmet(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user)
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		const { id } = paramsSchema.parse(request.params);
		const imagem = await lerImagemGrupoGourmet({
			id,
			idusuario: request.user.id,
		});
		return reply
			.type(imagem.tipo)
			.header("Cache-Control", "private, max-age=31536000, immutable")
			.header("ETag", `"${imagem.etag}"`)
			.send(imagem.conteudo);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}

export async function deleteImagemGrupoGourmet(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user)
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		const { id } = paramsSchema.parse(request.params);
		return reply.status(200).send(
			await removerImagemGrupoGourmet({
				id,
				idusuario: request.user.id,
			}),
		);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}
