import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { substituirAtalhosPdvService } from "@/service/atalho-pdv/substituir-atalhos-pdv.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const substituirAtalhosPdvBodySchema = z.object({
	idempresa: z.string().uuid(),
	idsProdutos: z.array(z.string().uuid()),
});

export async function substituirAtalhosPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = substituirAtalhosPdvBodySchema.parse(request.body);

		const resultado = await substituirAtalhosPdvService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			idsProdutos: body.idsProdutos,
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
