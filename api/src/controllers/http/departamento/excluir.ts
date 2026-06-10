import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirDepartamentoService } from "@/service/departamento/excluir-departamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const excluirDepartamentoParamsSchema = z.object({
	id: z.string(),
});

export async function excluirDepartamento(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = excluirDepartamentoParamsSchema.parse(request.params);

		const resultado = await excluirDepartamentoService({
			departamentoId: id,
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
