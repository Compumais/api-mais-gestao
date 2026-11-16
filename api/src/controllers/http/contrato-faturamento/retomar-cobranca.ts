import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { retomarCobrancaContratoService } from "@/service/contrato/confirmar-lote-faturamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ idempresa: z.string().min(1) });

export async function retomarCobrancaFaturamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const { idempresa } = bodySchema.parse(request.body);
		const resultado = await retomarCobrancaContratoService({
			idcobranca: id,
			idempresa,
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
