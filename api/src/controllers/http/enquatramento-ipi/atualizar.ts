import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarEnquatramentoIpiService } from "@/service/enquatramento-ipi/atualizar-enquatramento-ipi.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarEnquatramentoIpiParamsSchema = z.object({
	id: z.string(),
});

const atualizarEnquatramentoIpiBodySchema = z.object({
	codigo: z.string().max(20).optional(),
	descricao: z.string().max(100).optional(),
	grupocst: z.string().max(20).optional()
});

export async function atualizarEnquatramentoIpi(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarEnquatramentoIpiParamsSchema.parse(request.params);
		const dados = atualizarEnquatramentoIpiBodySchema.parse(request.body);

		const resultado = await atualizarEnquatramentoIpiService({
			enquatramentoIpiId: id,
			idusuario: request.user.id,
			dados,
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
