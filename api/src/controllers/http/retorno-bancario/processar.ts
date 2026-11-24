import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { processarRetornoBancarioService } from "@/service/retorno-bancario/processar-retorno.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	idsitens: z.array(z.string().uuid()).optional(),
});

export async function processarRetornoBancario(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);
		const resultado = await processarRetornoBancarioService({
			idretorno: id,
			idempresa: body.idempresa,
			idusuario: request.user.id,
			idsitens: body.idsitens,
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
			error: "Erro ao processar retorno bancário",
			code: "PROCESSAR_RETORNO_ERROR",
		});
	}
}
