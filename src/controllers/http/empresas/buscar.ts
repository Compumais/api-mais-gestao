import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarEmpresaService } from "../../../service/empresa/buscar-empresa";

const buscarEmpresaParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function buscarEmpresa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { id } = buscarEmpresaParamsSchema.parse(request.params);

		const resultado = await buscarEmpresaService(id);

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
			error: "Erro ao buscar empresa",
			code: "GET_EMPRESA_ERROR",
		});
	}
}
