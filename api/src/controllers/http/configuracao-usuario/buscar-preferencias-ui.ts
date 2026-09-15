import type { FastifyReply, FastifyRequest } from "fastify";
import { buscarPreferenciasUiUsuarioService } from "@/service/configuracao-usuario/buscar-preferencias-ui-usuario.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

export async function buscarPreferenciasUiUsuario(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const resultado = await buscarPreferenciasUiUsuarioService({
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		return reply.status(500).send({
			error: "Erro ao buscar preferências de UI do usuário",
			code: "GET_PREFERENCIAS_UI_USUARIO_ERROR",
		});
	}
}
