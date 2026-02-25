import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarUltimasMovimentacoesService } from "@/service/dashboard/buscar-ultimas-movimentacoes.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const buscarUltimasMovimentacoesQuerySchema = z.object({
	idempresa: z.uuid(),
});

export async function buscarUltimasMovimentacoes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = buscarUltimasMovimentacoesQuerySchema.parse(request.query);

		const resultado = await buscarUltimasMovimentacoesService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
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
			error: "Erro ao buscar últimas movimentações",
			code: "DASHBOARD_ERROR",
		});
	}
}
