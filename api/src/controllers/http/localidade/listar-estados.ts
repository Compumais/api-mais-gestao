import type { FastifyReply, FastifyRequest } from "fastify";
import { listarEstadosService } from "@/service/localidade/listar-estados.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

export async function listarEstados(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const resultado = await listarEstadosService();

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		return reply.status(500).send({
			error: "Erro ao listar estados",
			code: "LIST_ESTADOS_ERROR",
		});
	}
}
