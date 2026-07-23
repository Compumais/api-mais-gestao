import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { cancelarNotaFiscalCompraService } from "@/service/nota-fiscal/cancelar-nota-fiscal-compra.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	motivo: z.string().max(255).optional(),
});

export async function cancelarNotaFiscalCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);

		const resultado = await cancelarNotaFiscalCompraService({
			notaFiscalId: id,
			idusuario: request.user.id,
			idempresa: body.idempresa,
			motivo: body.motivo,
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
