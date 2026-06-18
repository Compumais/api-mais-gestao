import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarMunicipiosService } from "@/service/localidade/listar-municipios.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const listarMunicipiosParamsSchema = z.object({
	uf: z.string().length(2),
});

const listarMunicipiosQuerySchema = z.object({
	nome: z.string().optional(),
});

export async function listarMunicipios(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = listarMunicipiosParamsSchema.parse(request.params);
		const query = listarMunicipiosQuerySchema.parse(request.query);

		const resultado = await listarMunicipiosService({
			uf: params.uf,
			...(query.nome ? { nome: query.nome } : {}),
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
			error: "Erro ao listar municípios",
			code: "LIST_MUNICIPIOS_ERROR",
		});
	}
}
