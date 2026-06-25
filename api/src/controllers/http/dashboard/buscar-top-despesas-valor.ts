import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { buscarTopDespesasValorService } from "@/service/dashboard/buscar-dados-dashboard.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid().optional(),
	dias: z.coerce.number().min(1).max(365).default(90),
});

export async function buscarTopDespesasValor(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);

		const resultado = await buscarTopDespesasValorService({
			idusuario: request.user.id,
			...(query.idempresa && { idempresa: query.idempresa }),
			dias: query.dias,
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
			error: "Erro ao buscar top despesas por valor",
			code: "TOP_DESPESAS_VALOR_ERROR",
		});
	}
}
