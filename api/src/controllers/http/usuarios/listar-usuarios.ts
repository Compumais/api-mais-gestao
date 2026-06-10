import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarUsuariosService } from "@/service/usuarios/listar-usuarios.js";

const listarUsuariosQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(10),
	nome: z.string().optional(),
	email: z.string().optional(),
	idempresa: z.string().uuid(),
});

export async function listarUsuarios(
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
		const query = listarUsuariosQuerySchema.parse(request.query);

		const resultado = await listarUsuariosService({
			idusuario,
			...query,
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
			error: "Erro ao listar usuários",
			code: "LIST_USUARIOS_ERROR",
		});
	}
}
