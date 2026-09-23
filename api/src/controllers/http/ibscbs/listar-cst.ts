import type { FastifyReply, FastifyRequest } from "fastify";
import { listarCstIbsCbs } from "@/util/catalogo-ibs-cbs.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

export async function listarCstIbsCbsHttp(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		return reply.status(200).send({ data: listarCstIbsCbs() });
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
