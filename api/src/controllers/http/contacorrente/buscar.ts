import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarContaCorrentePorIdService } from "@/service/contacorrente/buscar-por-id.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const buscarContaCorrenteParamsSchema = z.object({
	id: z.string(),
});

export async function buscarContaCorrente(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = buscarContaCorrenteParamsSchema.parse(request.params);

		const contaCorrente = await buscarContaCorrentePorIdService({
			idusuario: request.user.id,
			id,
		});

		if (!contaCorrente.success) {
			return reply.status(contaCorrente.status).send(contaCorrente);
		}

		return reply.status(contaCorrente.status).send(contaCorrente.body);
	} catch (err) {
		console.error(err);
		if (err instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: err.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
