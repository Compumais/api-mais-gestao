import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	ErroBancoImagem,
	vincularProdutoAoBancoService,
} from "@/service/banco-imagem/gerenciar-banco-imagem.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.uuid() });
const bodySchema = z.object({
	idbancoimagem: z.uuid().nullable(),
});

export async function vincularBancoImagemProduto(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);
		const produto = await vincularProdutoAoBancoService({
			idproduto: id,
			idusuario: request.user.id,
			idbancoimagem: body.idbancoimagem,
		});
		return reply.send(produto);
	} catch (erro) {
		if (erro instanceof ErroBancoImagem) {
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
}
