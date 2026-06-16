import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarFechamentoCaixaService } from "@/service/fechamento-caixa/buscar-fechamento-caixa.js";

const buscarFechamentoCaixaParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export async function buscarFechamentoCaixa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const idusuario = request.user.id;
		const { id } = buscarFechamentoCaixaParamsSchema.parse(request.params);

		const resultado = await buscarFechamentoCaixaService({
			fechamentoCaixaId: id,
			idusuario,
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
			error: "Erro ao buscar fechamento de caixa",
			code: "GET_FECHAMENTO_CAIXA_ERROR",
		});
	}
}
