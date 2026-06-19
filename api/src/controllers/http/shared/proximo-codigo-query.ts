import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarProximoCodigoService } from "@/service/proximo-codigo/buscar-proximo-codigo.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const proximoCodigoQuerySchema = z.object({
	idempresa: z.string().min(1),
});

type RecursoProximoCodigo =
	| "produto"
	| "hierarquia"
	| "banco"
	| "unidade-medida"
	| "conta-corrente"
	| "condicao-pagamento";

export function criarHandlerProximoCodigo(recurso: RecursoProximoCodigo) {
	return async function handlerProximoCodigo(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}

			const query = proximoCodigoQuerySchema.parse(request.query);

			const resultado = await buscarProximoCodigoService({
				idusuario: request.user.id,
				idempresa: query.idempresa,
				recurso,
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
	};
}
