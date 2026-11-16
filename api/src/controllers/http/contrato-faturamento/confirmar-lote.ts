import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { confirmarLoteFaturamentoService } from "@/service/contrato/confirmar-lote-faturamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().min(1),
	competencia: z.string().min(7).max(7),
	idsContratos: z.array(z.string().min(1)).min(1),
});

export async function confirmarLoteFaturamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodySchema.parse(request.body);
		const resultado = await confirmarLoteFaturamentoService({
			...body,
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
