import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { transmitirNfeVendaService } from "@/service/nfe-emissao/transmitir-nfe-venda.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const transmitirNfeParamsSchema = z.object({
	id: z.string().uuid(),
});

const transmitirNfeBodySchema = z.object({
	confirmarProducao: z.boolean().default(false),
});

export async function transmitirNfe(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = transmitirNfeParamsSchema.parse(request.params);
		const { confirmarProducao } = transmitirNfeBodySchema.parse(
			request.body ?? {},
		);

		const resultado = await transmitirNfeVendaService({
			idusuario: request.user.id,
			idnotafiscal: id,
			confirmarProducao,
		});

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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
