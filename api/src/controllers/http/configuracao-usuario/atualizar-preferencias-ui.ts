import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarPreferenciasUiUsuarioService } from "@/service/configuracao-usuario/atualizar-preferencias-ui-usuario.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const atualizarPreferenciasUiBodySchema = z.object({
	colunasTabelas: z
		.record(z.string(), z.record(z.string(), z.boolean()))
		.optional(),
	layoutMenu: z.enum(["sidebar", "topbar"]).optional(),
});

export async function atualizarPreferenciasUiUsuario(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = atualizarPreferenciasUiBodySchema.parse(request.body);

		const resultado = await atualizarPreferenciasUiUsuarioService({
			idusuario: request.user.id,
			dados: {
				...(dados.colunasTabelas !== undefined
					? { colunasTabelas: dados.colunasTabelas }
					: {}),
				...(dados.layoutMenu !== undefined
					? { layoutMenu: dados.layoutMenu }
					: {}),
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
		return reply.status(500).send({
			error: "Erro ao atualizar preferências de UI do usuário",
			code: "UPDATE_PREFERENCIAS_UI_USUARIO_ERROR",
		});
	}
}
