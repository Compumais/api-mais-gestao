import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { cancelarNfeVendaService } from "@/service/nfe-emissao/cancelar-nfe-venda.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const bodySchema = z.object({
	justificativa: z.string().min(15).max(255),
});

export async function cancelarNfe(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const { justificativa } = bodySchema.parse(request.body ?? {});

		const resultado = await cancelarNfeVendaService({
			idusuario: request.user.id,
			idnotafiscal: id,
			justificativa,
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
