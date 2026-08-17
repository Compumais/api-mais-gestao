import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarPdvFiscalService } from "@/service/terminal-pdv/buscar-pdv-fiscal.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({
	numeropdv: z.coerce.number().int().min(1).max(999),
});

export async function buscarPdvFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const { numeropdv } = querySchema.parse(request.query);

		const resultado = await buscarPdvFiscalService({
			idempresa: id,
			idusuario: request.user.id,
			numeropdv,
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
