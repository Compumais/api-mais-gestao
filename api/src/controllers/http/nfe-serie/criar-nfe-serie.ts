import z from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { criarNfeSerieService } from "@/service/nfe-serie/nfe-serie.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";


const criarBodySchema = z.object({
	idempresa: z.string().uuid(),
	modelo: z.string().max(2).optional(),
	serie: z.string().min(1).max(3),
	numeroproximo: z.number().int().min(1).optional(),
	padrao: z.boolean().optional(),
	ativo: z.boolean().optional(),
});

export async function criarNfeSerie(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = criarBodySchema.parse(request.body);

		const resultado = await criarNfeSerieService({
			idempresa: dados.idempresa,
			idusuario: request.user.id,
			dados: {
				serie: dados.serie,
				...(dados.modelo !== undefined ? { modelo: dados.modelo } : {}),
				...(dados.numeroproximo !== undefined
					? { numeroproximo: dados.numeroproximo }
					: {}),
				...(dados.padrao !== undefined ? { padrao: dados.padrao } : {}),
				...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
			},
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
