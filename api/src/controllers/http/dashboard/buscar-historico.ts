import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { buscarHistoricoFinanceiroService } from "@/service/dashboard/buscar-dados-dashboard.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const buscarHistoricoFinanceiroQuerySchema = z.object({
	idempresa: z.uuid(),
	dias: z.coerce.number().min(1).max(365).default(90),
});

export async function buscarHistoricoFinanceiro(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = buscarHistoricoFinanceiroQuerySchema.parse(request.query);

		const resultado = await buscarHistoricoFinanceiroService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
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
			error: "Erro ao buscar histórico financeiro",
			code: "HISTORICO_ERROR",
		});
	}
}
