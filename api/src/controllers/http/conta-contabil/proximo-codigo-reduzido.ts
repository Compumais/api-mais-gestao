import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarProximoCodigoReduzidoService } from "@/service/contacontabil/buscar-proximo-codigo-reduzido.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const proximoCodigoReduzidoQuerySchema = z.object({
	idempresa: z.string().min(1),
});

export async function buscarProximoCodigoReduzido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = proximoCodigoReduzidoQuerySchema.parse(request.query);

		const resultado = await buscarProximoCodigoReduzidoService({
			idusuario: request.user.id,
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
