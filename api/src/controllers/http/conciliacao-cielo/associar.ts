import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { associarItemConciliacaoCieloService } from "@/service/conciliacao-cielo/associar-item-cielo.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	iditem: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	idfinanceiro: z.string().uuid().nullable(),
});

export async function associarItemConciliacaoCielo(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { iditem } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);
		const resultado = await associarItemConciliacaoCieloService({
			iditem,
			idempresa: body.idempresa,
			idusuario: request.user.id,
			idfinanceiro: body.idfinanceiro,
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
		return reply.status(500).send({
			error: "Erro ao associar item da conciliação Cielo",
			code: "ASSOCIAR_CONCILIACAO_CIELO_ERROR",
		});
	}
}
