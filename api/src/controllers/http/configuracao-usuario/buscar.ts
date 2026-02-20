import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/buscar-configuracao-usuario";
import { httpNaoAutorizado } from "@/util/http-util";

const buscarConfiguracaoUsuarioQuerySchema = z.object({
	idempresa: z.string().optional(),
});

export async function buscarConfiguracaoUsuario(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = buscarConfiguracaoUsuarioQuerySchema.parse(request.query);

		const resultado = await buscarConfiguracaoUsuarioService({
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
		return reply.status(500).send({
			error: "Erro ao buscar configurações do usuário",
			code: "GET_CONFIGURACAO_USUARIO_ERROR",
		});
	}
}

