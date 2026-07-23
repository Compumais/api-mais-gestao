import z from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { httpErroInterno, httpNaoAutorizado } from "src/util/http-util";
import { excluirNfeSerieService } from "src/service/nfe-serie/nfe-serie";

const queryEmpresaSchema = z.object({
    idempresa: z.string().uuid(),
    modelo: z.string().max(2).optional(),
});

export async function excluirNfeSerie(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const { idempresa } = queryEmpresaSchema
			.pick({ idempresa: true })
			.parse(request.query);

		const resultado = await excluirNfeSerieService({
			id,
			idempresa,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
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