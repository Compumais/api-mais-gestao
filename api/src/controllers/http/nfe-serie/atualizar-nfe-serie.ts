import z from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { atualizarNfeSerieService } from "@/service/nfe-serie/nfe-serie.js";

const criarBodySchema = z.object({
    idempresa: z.string().uuid(),
    modelo: z.string().max(2).optional(),
    serie: z.string().min(1).max(3),
    numeroproximo: z.number().int().min(1).optional(),
    padrao: z.boolean().optional(),
    ativo: z.boolean().optional(),
});

const atualizarBodySchema = criarBodySchema
	.omit({ idempresa: true })
	.partial()
	.extend({ idempresa: z.string().uuid()
});

export async function atualizarNfeSerie(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const dados = atualizarBodySchema.parse(request.body);

		const { idempresa, ...resto } = dados;
		const resultado = await atualizarNfeSerieService({
			id,
			idempresa,
			idusuario: request.user.id,
			dados: resto as Partial<Parameters<typeof atualizarNfeSerieService>[0]["dados"]>,
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