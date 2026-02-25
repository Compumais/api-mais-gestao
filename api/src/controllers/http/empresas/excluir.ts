import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirEmpresaService } from "../../../service/empresa/excluir-empresa.js";

const excluirEmpresaParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function excluirEmpresa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { id } = excluirEmpresaParamsSchema.parse(request.params);

		const resultado = await excluirEmpresaService(id);

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
				details: error.message,
			});
		}
		return reply.status(500).send({
			error: "Erro ao excluir empresa",
			code: "DELETE_EMPRESA_ERROR",
		});
	}
}
