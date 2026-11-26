import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { confirmarConciliacaoCieloService } from "@/service/conciliacao-cielo/confirmar-conciliacao-cielo.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	idcontacorrente: z.string().uuid(),
	idsitens: z.array(z.string().uuid()).optional(),
	baixarTitulos: z.boolean().optional().default(true),
});

export async function confirmarConciliacaoCielo(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);
		const resultado = await confirmarConciliacaoCieloService({
			idconciliacao: id,
			idempresa: body.idempresa,
			idusuario: request.user.id,
			idcontacorrente: body.idcontacorrente,
			idsitens: body.idsitens,
			baixarTitulos: body.baixarTitulos,
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
			error: "Erro ao confirmar conciliação Cielo",
			code: "CONFIRMAR_CONCILIACAO_CIELO_ERROR",
		});
	}
}
