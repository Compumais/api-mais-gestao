import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarContaCorrentePorIdService } from "@/service/contacorrente/buscar-por-id";
import { httpNaoAutorizado } from "@/util/http-util";

const buscarContaCorrenteParamsSchema = z.object({
	id: z.string(),
});

export async function buscarContaCorrente(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply
				.status(httpNaoAutorizado().status)
				.send(httpNaoAutorizado().error);
		}

		const { id } = buscarContaCorrenteParamsSchema.parse(request.params);

		const contaCorrente = await buscarContaCorrentePorIdService({ id });

		if (!contaCorrente.success) {
			return reply.status(contaCorrente.status).send(contaCorrente.error);
		}

		return reply.status(contaCorrente.status).send(contaCorrente.body);
	} catch (err) {
		console.error(err);
	}
}
