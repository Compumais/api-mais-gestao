import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	ErroImagemProduto,
	lerArquivoImagemProduto,
	lerImagemProduto,
	listarGaleriaProduto,
	removerImagemGaleriaProduto,
	removerImagemProduto,
	salvarImagemPrincipalProduto,
	salvarImagemProduto,
	tornarImagemPrincipal,
} from "@/service/produto/imagem-produto.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.uuid() });
const imagemParamsSchema = z.object({ id: z.uuid(), idimagem: z.uuid() });

function responderErro(
	erro: unknown,
	reply: FastifyReply,
): ReturnType<FastifyReply["send"]> {
	if (erro instanceof ErroImagemProduto) {
		return reply.status(erro.status).send({
			error: erro.message,
			code: erro.codigo,
		});
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

export async function uploadImagemProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsSchema.parse(request.params);
		if (!Buffer.isBuffer(request.body)) {
			throw new ErroImagemProduto(
				"Conteúdo da imagem não informado",
				400,
				"IMAGEM_AUSENTE",
			);
		}
		const produto = await salvarImagemPrincipalProduto({
			idproduto: id,
			idusuario: request.user.id,
			conteudo: request.body,
			tipoInformado: request.headers["content-type"]?.split(";")[0],
			nomeArquivo:
				typeof request.headers["x-file-name"] === "string"
					? decodeURIComponent(request.headers["x-file-name"])
					: undefined,
			ip: request.ip,
		});
		return reply.status(200).send(produto);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}

export async function listarImagensProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsSchema.parse(request.params);
		return reply.send(
			await listarGaleriaProduto({
				idproduto: id,
				idusuario: request.user.id,
			}),
		);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}

export async function adicionarImagemProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsSchema.parse(request.params);
		if (!Buffer.isBuffer(request.body)) {
			throw new ErroImagemProduto(
				"Conteúdo da imagem não informado",
				400,
				"IMAGEM_AUSENTE",
			);
		}
		const imagem = await salvarImagemProduto({
			idproduto: id,
			idusuario: request.user.id,
			conteudo: request.body,
			tipoInformado: request.headers["content-type"]?.split(";")[0],
			nomeArquivo:
				typeof request.headers["x-file-name"] === "string"
					? decodeURIComponent(request.headers["x-file-name"])
					: undefined,
		});
		return reply.status(201).send(imagem);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}

export async function downloadArquivoImagemProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id, idimagem } = imagemParamsSchema.parse(request.params);
		const imagem = await lerArquivoImagemProduto({
			idproduto: id,
			idimagem,
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

export async function definirPrincipalImagemProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id, idimagem } = imagemParamsSchema.parse(request.params);
		return reply.send(
			await tornarImagemPrincipal({
				idproduto: id,
				idimagem,
				idusuario: request.user.id,
			}),
		);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}

export async function deleteImagemGaleriaProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id, idimagem } = imagemParamsSchema.parse(request.params);
		await removerImagemGaleriaProduto({
			idproduto: id,
			idimagem,
			idusuario: request.user.id,
		});
		return reply.status(204).send();
	} catch (erro) {
		return responderErro(erro, reply);
	}
}

export async function downloadImagemProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsSchema.parse(request.params);
		const imagem = await lerImagemProduto({
			idproduto: id,
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

export async function deleteImagemProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsSchema.parse(request.params);
		const produto = await removerImagemProduto({
			idproduto: id,
			idusuario: request.user.id,
			ip: request.ip,
		});
		return reply.status(200).send(produto);
	} catch (erro) {
		return responderErro(erro, reply);
	}
}
