import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarRetornoBancarioService } from "@/service/retorno-bancario/buscar-retorno.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const querySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function buscarRetornoBancario(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const query = querySchema.parse(request.query);
		const resultado = await buscarRetornoBancarioService({
			id,
			idempresa: query.idempresa,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado.error ?? resultado);
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
			error: "Erro ao buscar retorno bancário",
			code: "BUSCAR_RETORNO_ERROR",
		});
	}
}
