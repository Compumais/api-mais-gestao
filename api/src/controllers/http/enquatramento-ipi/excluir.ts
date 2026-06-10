import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirEnquatramentoIpiService } from "@/service/enquatramento-ipi/excluir-enquatramento-ipi.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const excluirEnquatramentoIpiParamsSchema = z.object({
	id: z.string(),
});

export async function excluirEnquatramentoIpi(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = excluirEnquatramentoIpiParamsSchema.parse(request.params);

		const resultado = await excluirEnquatramentoIpiService({
			enquatramentoIpiId: id,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
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
