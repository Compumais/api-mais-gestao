import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarEmpresaService } from "../../service/empresa/atualizar-empresa";

const atualizarEmpresaParamsSchema = z.object({
	id: z.string().uuid(),
});

const atualizarEmpresaBodySchema = z.object({
	nome: z.string().optional(),
	cnpj: z.string().optional(),
	telefone: z.string().optional(),
});

export async function atualizarEmpresa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { id } = atualizarEmpresaParamsSchema.parse(request.params);
		const dados = atualizarEmpresaBodySchema.parse(request.body);

		const resultado = await atualizarEmpresaService({ id, dados });

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
			error: "Erro ao atualizar empresa",
			code: "UPDATE_EMPRESA_ERROR",
		});
	}
}
