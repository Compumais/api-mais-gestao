import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { abrirCotacaoCompraService } from "@/service/cotacoes-compra/abrir-cotacao-compra.js";
import {
	cancelarCotacaoCompraService,
	encerrarCotacaoCompraService,
} from "@/service/cotacoes-compra/encerrar-cotacao-compra.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });

async function executarAcao(
	request: FastifyRequest,
	reply: FastifyReply,
	acao: typeof abrirCotacaoCompraService,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const resultado = await acao({ id, idusuario: request.user.id });

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(500).send({
			error: "Erro ao alterar status da cotação",
			code: "COTACAO_COMPRA_STATUS_ERROR",
		});
	}
}

export async function abrirCotacaoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	return executarAcao(request, reply, abrirCotacaoCompraService);
}

export async function encerrarCotacaoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	return executarAcao(request, reply, encerrarCotacaoCompraService);
}

export async function cancelarCotacaoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	return executarAcao(request, reply, cancelarCotacaoCompraService);
}
