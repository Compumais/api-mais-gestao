import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { criarUsuarioService } from "@/service/usuarios/criar-usuario.js";

const criarUsuarioBodySchema = z.object({
	nome: z.string().min(1, "Nome é obrigatório"),
	email: z.email("Email inválido"),
	password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
	perfil: z.union([z.string(), z.array(z.string())]),
	empresasIds: z.array(z.uuid()),
	idempresa: z.uuid(),
});

export async function criarUsuario(
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
		const body = criarUsuarioBodySchema.parse(request.body);

		const resultado = await criarUsuarioService({
			idusuario,
			idempresa: body.idempresa,
			nome: body.nome,
			email: body.email,
			password: body.password,
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
			error: "Erro ao criar usuário",
			code: "CREATE_USUARIO_ERROR",
		});
	}
}
