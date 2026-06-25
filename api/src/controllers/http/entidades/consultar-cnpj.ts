import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { consultarCnpjEntidadeService } from "@/service/entidades/consultar-cnpj-entidade.js";

const consultarCnpjParamsSchema = z.object({
	cnpj: z.string().min(1),
});

const consultarCnpjQuerySchema = z.object({
	idempresa: z.string().uuid().optional(),
});

export async function consultarCnpj(
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

		const params = consultarCnpjParamsSchema.parse(request.params);
		const query = consultarCnpjQuerySchema.parse(request.query);

		const resultado = await consultarCnpjEntidadeService({
			cnpj: params.cnpj,
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
			error: "Erro ao consultar CNPJ",
			code: "CONSULTAR_CNPJ_ERROR",
		});
	}
}
