import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { atualizarUsuarioService } from "@/service/usuarios/atualizar-usuario.js";
import { perfilUsuarioSchema } from "@/util/usuario-perfil.js";

const atualizarUsuarioBodySchema = z.object({
	nome: z.string().min(1).optional(),
	perfil: perfilUsuarioSchema.optional(),
	empresasIds: z.array(z.uuid()),
	idempresa: z.uuid(),
});

const atualizarUsuarioParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function atualizarUsuario(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const idusuario = request.user.id;
		const params = atualizarUsuarioParamsSchema.parse(request.params);
		const body = atualizarUsuarioBodySchema.parse(request.body);

		const resultado = await atualizarUsuarioService({
			idusuario,
			idUsuarioAtualizar: params.id,
			idempresa: body.idempresa,
			nome: body.nome,
			perfil: body.perfil,
			empresasIds: body.empresasIds,
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
			error: "Erro ao atualizar usuário",
			code: "UPDATE_USUARIO_ERROR",
		});
	}
}
