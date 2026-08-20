import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarRegraFiscalService } from "@/service/regra-fiscal/atualizar-regra-fiscal.js";
import { atualizarRegraFiscalBodySchema } from "./body-schema.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function atualizarRegraFiscal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const dados = atualizarRegraFiscalBodySchema.parse(request.body);
		const resultado = await atualizarRegraFiscalService({
			id,
			dados,
			idusuario: request.user.id,
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
