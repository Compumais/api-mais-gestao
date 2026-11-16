import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { importarRetornoBancarioService } from "@/service/retorno-bancario/importar-retorno.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	idcontacorrente: z.string().uuid(),
	nomearquivo: z.string().min(1).max(180),
	conteudo: z.string().min(1),
});

export async function importarRetornoBancario(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodySchema.parse(request.body);
		const resultado = await importarRetornoBancarioService({
			idempresa: body.idempresa,
			idusuario: request.user.id,
			idcontacorrente: body.idcontacorrente,
			nomearquivo: body.nomearquivo,
			conteudo: body.conteudo,
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
			error: "Erro ao importar retorno bancário",
			code: "IMPORTAR_RETORNO_ERROR",
		});
	}
}
